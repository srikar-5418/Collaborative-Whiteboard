from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# MongoDB Setup using environment variables
mongoDBUsername = os.getenv("MONGO_DB_USERNAME")
mongoDBPassword = os.getenv("MONGO_DB_PASSWORD")
mongoDBString = f"mongodb+srv://{mongoDBUsername}:{mongoDBPassword}@{os.getenv('MONGO_DB_STRING')}/?ssl=true&retryWrites=true&w=majority&appName=Cluster0"

# FastAPI app instance
app = FastAPI()

# MongoDB client setup
client = AsyncIOMotorClient(mongoDBString)
db = client["whiteBoard_Collaborative"]
collection = db["Connection_Info"]

rooms: dict[str, List[WebSocket]] = {}

# WebSocket endpoint for each room
@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()

    room_info = await collection.find_one({"room_id": room_id})
    
    if room_info is None:
        undoArr = []
        redoArr = []
        new_room = {
            "room_id": room_id,
            "undoArr": undoArr,
            "redoArr": redoArr
        }
        await collection.insert_one(new_room)
    else:
        undoArr = room_info["undoArr"]
        redoArr = room_info["redoArr"]

    await websocket.send_json({
        "message": "roomPreviouslyExisted",
        "undoArr": undoArr,
        "redoArr": redoArr
    })

    if room_id not in rooms:
        rooms[room_id] = []
    
    rooms[room_id].append(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            action = message.get("message")
            
            # Get fresh state from DB for each action
            room_info = await collection.find_one({"room_id": room_id})
            undoArr = room_info["undoArr"]
            redoArr = room_info["redoArr"]

            if action == "clear":
                undoArr = []
                redoArr = []
            elif action == "undo":
                if len(undoArr) > 1:  # Always keep at least one state
                    redoArr.insert(0, undoArr.pop())
            elif action == "redo":
                if redoArr:
                    undoArr.append(redoArr.pop(0))
            elif action == "save":
                canvas = message.get("imgUrl")
                undoArr.append(canvas)
                redoArr = []

            # Update database with new state
            await collection.update_one(
                {"room_id": room_id},
                {"$set": {"undoArr": undoArr, "redoArr": redoArr}},
                upsert=True
            )

            # Broadcast to all clients
            for client in rooms[room_id]:
                await client.send_json({
                    "message": action,
                    "undoArr": undoArr,
                    "redoArr": redoArr
                })

    except WebSocketDisconnect:
        rooms[room_id].remove(websocket)
        if not rooms[room_id]:
            del rooms[room_id]
