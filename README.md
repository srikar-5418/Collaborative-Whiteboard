# Collaborative-Whiteboard
This is a collaborative whiteboard made using React Js, Material UI, web Sockets, and Mongo Db, Fast API.

<h3>Tech Stack Used :</h3>
<ul>
  <li>Vite+React Js (Client Side)</li>
  <li>Fast API (Server Side)</li>
  <li>WebSockets (For Real Time Communication)</li>
  <li>Mongo Db (For storage)</li>
  <li>Material UI (For design Components)</li>
  <li>React Icons (For various icons)</li>
</ul>

<h3>Features :</h3>
<ul>
  <li>Collaborative drawing by connecting with same room number.</li>
  <li>Various colors and shapes of varibles sizes are available.</li>
  <li>Undo, Redo and Clear code are available.</li>
  <li>Drawing can be stored as PNG with just a click.</li>
  <li>Drawing is always saved in the room number which you drawed in.</li>
</ul>

Demo :
Single User using :
<br>

![](https://github.com/srikar-5418/Collaborative-Whiteboard/blob/main/fullVideoOriginalGif.gif)

Multiple User collaborating :
<br>

![](https://github.com/srikar-5418/Collaborative-Whiteboard/blob/main/demoVideo.gif)


<br>
<h3>Setup Instructions :</h3>
Once Cloning the repository and opening it on your system. You should do different things for both frontend and backend.
<h4>For FrontEnd :</h4>
Open the root directory of the folder in a terminal and run the following.<br>  
<br>

```powershell
cd ./frontend
npm install
```
The above command installs all the required dependencies.Then run the following command to run the frontend.<br> 

```powershell
npm run dev
```
now the app should run at **https://localhost:5173**

<h4>For Backend :</h4>
Open the root directory of the folder in a terminal and run the following. <br><br>

```powershell
cd ./fastAPI_Backend
fastapi-env\Scripts\activate #if you want to run in virtual envoriment 
pip install fastapi uvicorn motor pydantic quote_plus python-dotenv
unicorn main:app -reload   #this runs the backend
```
the above commands should run the backend at **https://127.0.0.1:8000** and the webSockets at `ws://127.0.0.1:8000/ws`. 

<h4>For MongoDB :</h4>
Create a dot .env file and atlas acount create a database and collections in it. 
<br> <br>

```.env
# MongoDB connection details (replace with your actual credentials)
MONGO_DB_USERNAME=your-mongo-username  # e.g., 
MONGO_DB_PASSWORD=your-mongo-password  # e.g.,
MONGO_DB_STRING=your-mongo-cluster-url  # e.g., 
```
now also make sure you edit the collection and database name in the main.py.
<br>

```main.py
# MongoDB client setup
client = AsyncIOMotorClient(mongoDBString)
db = client["whiteBoard_Collaborative"]
collection = db["Connection_Info"]
```
<h4>End Points :</h4>

There are no http end points in the projects since the project is designed in such a way that it is mandatory to join a room.
so the websockets endpoints are : `ws://127.0.0.1:8000/ws`
and various messages along with data are sent via websockets for `undo` , `redo` , `update` and `clear` to client to client via server and also to mongoDB. 
