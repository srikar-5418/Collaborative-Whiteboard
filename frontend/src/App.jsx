import { Box, Button, IconButton, Slider, Stack, TextField, Tooltip, Typography,Snackbar } from '@mui/material';
import ClearIcon from '@mui/icons-material/CleaningServices';
import { LuUndo,LuRedo,LuEraser,LuSave} from "react-icons/lu";
import { LuPencil, LuCircle, LuSquare, LuMinus } from "react-icons/lu";


import './App.css';
import { useEffect, useRef, useState } from 'react';

function App() {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const currentRoom= useRef(null);
  const [connectedToSocket,setConnectedToSocket] =useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [lineWidth, setLineWidth] = useState(5);
  const [roomNumber, setRoomNumber] = useState("");
  const [currentColor, setCurrentColor] = useState('purple');
  const [currentShape, setCurrentShape] = useState('none'); 
  const shapeStartPos = useRef(null);
  const [isErasing, setIsErasing] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const socket = useRef(null);

  const colors = [
    { name: 'Purple', hex: 'purple' },
    { name: 'Blue', hex: '#1e88e5' },
    { name: 'Green', hex: '#4caf50' },
    { name: 'Orange', hex: '#FF9800' },
    { name: 'Light Gray', hex: '#B0BEC5' }
  ];
  useEffect(() => {
    return () => {
      if (socket.current) {
        socket.current.close();
      }
    };
  }, []);

  const connectToWebSocket = () => {
    if (socket.current === null) {
      socket.current = new WebSocket(`ws://localhost:8000/ws/${currentRoom.current}`);

      socket.current.onopen = () => {
        setConnectedToSocket(true);
        console.log(`Connected to room: ${currentRoom.current}`);
      };

      socket.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const context = canvasRef.current.getContext('2d');
        setUndoStack(data.undoArr);
        setRedoStack(data.redoArr);
        if (data.undoArr.length > 0) {
          restoreCanvasState(context, data.undoArr[data.undoArr.length - 1]);
        } else {
          context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      };

      socket.current.onerror = (error) => {
        console.error('WebSocket.current error:', error);
      };

      socket.current.onclose = (event) => {
        if (event.wasClean) {
          if(connectToWebSocket)
          setConnectedToSocket(false);
          console.log('Closed cleanly');
          socket.current=null;
        } else {
          console.error('Closed with error');
          if(connectToWebSocket)
            setConnectedToSocket(false);
          socket.current=null;
        }
      };
    }
  };

  const generateRoom = () => {
    const randomRoom = Math.floor(Math.random() * 10000);
    setRoomNumber(randomRoom);
    currentRoom.current = randomRoom;
  };


  const handleDrawerStart = () => {
    if (!connectedToSocket) {
      setOpenSnackbar(true);
    }
  };

  const handleJoinRoom = () => {
    if (!connectedToSocket) {
      const userConfirmed = window.confirm('You are not connected to any room. Do you want to join a new room?');
      
      if (userConfirmed) {
        generateRoom();
        connectToWebSocket();
      }
    } else {
      console.log("Already connected to a room.");
    }
  };
  

  const handleCancelJoin = () => {
    setOpenSnackbar(false);
  };

  const disconnectFromWeb = () => {
    if(socket.current !== null) {
      socket.current.close();
      setConnectedToSocket(false);
      setUndoStack([]);
      setRedoStack([]);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }; 

  const saveCanvasState = (canvas) => {
    const imgUrl = canvas.toDataURL();
    setUndoStack(prev => [...prev, imgUrl]);
    setRedoStack([]);
    if(socket.current!==null){
      const message=JSON.stringify({message:'save',imgUrl:imgUrl})
      socket.current.send(message);
    }
  };

  const restoreCanvasState = (context, imgUrl) => {
    const img = new Image();
    img.src = imgUrl;
    img.onload = () => {
      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
      context.drawImage(img, 0, 0);
    };
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const canvasWidth = canvas.parentElement.offsetWidth;
    const canvasHeight = canvas.parentElement.offsetHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
  
    if (undoStack.length === 0) {
      saveCanvasState(canvas);
    }
  
    const canvasBound = canvas.getBoundingClientRect();
  
    const createCustomCursor = () => {
      if (isErasing) {
        const cursorCanvas = document.createElement('canvas');
        cursorCanvas.width = lineWidth;
        cursorCanvas.height = lineWidth;
        const cursorContext = cursorCanvas.getContext('2d');
        
        cursorContext.fillStyle = 'rgba(0,0,0,0.3)';
        cursorContext.fillRect(0, 0, lineWidth, lineWidth);
        cursorContext.strokeStyle = 'black';
        cursorContext.strokeRect(0, 0, lineWidth, lineWidth);
        
        canvas.style.cursor = `url(${cursorCanvas.toDataURL()}) ${lineWidth/2} ${lineWidth/2}, auto`;
      } else {
        canvas.style.cursor = 'crosshair';
      }
    };
  
    createCustomCursor();
    
    if (undoStack.length > 0) {
      restoreCanvasState(context, undoStack[undoStack.length - 1]);
    }
  
    const drawShape = (startPos, endPos) => {
      context.beginPath();
      context.strokeStyle = currentColor;
      context.lineWidth = lineWidth;
      context.lineCap = 'round';
      context.lineJoin = 'round';
  
      switch (currentShape) {
        case 'line':
          context.moveTo(startPos.x, startPos.y);
          context.lineTo(endPos.x, endPos.y);
          break;
        case 'circle':
          { const radius = Math.sqrt(
            Math.pow(endPos.x - startPos.x, 2) + 
            Math.pow(endPos.y - startPos.y, 2)
          );
          context.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
          break; }
        case 'rectangle':
          { const width = endPos.x - startPos.x;
          const height = endPos.y - startPos.y;
          context.rect(startPos.x, startPos.y, width, height);
          break; }
        default:
          break;
      }
      context.stroke();
    };
  
    const onMouseDown = (event) => {
      if (event.button === 0) {
        isDrawing.current = true;
        const x = event.clientX - canvasBound.left;
        const y = event.clientY - canvasBound.top;
        
        if (currentShape === 'pencil' || isErasing) {
          lastPos.current = { x, y };
        } else {
          shapeStartPos.current = { x, y };
        }
      }
    };
  
    const onMouseMove = (event) => {
      if (!isDrawing.current) return;
      
      const x = event.clientX - canvasBound.left;
      const y = event.clientY - canvasBound.top;
  
      if (currentShape === 'pencil' || isErasing) {
        context.beginPath();
        context.moveTo(lastPos.current.x, lastPos.current.y);
        context.lineTo(x, y);
        if (isErasing) {
          context.strokeStyle = 'white';
          context.lineWidth = lineWidth;
          context.lineCap = 'square';
          context.lineJoin = 'miter';
        } else {
          context.strokeStyle = currentColor;
          context.lineWidth = lineWidth;
          context.lineCap = 'round';
          context.lineJoin = 'round';
        }
        context.stroke();
        lastPos.current = { x, y };
      }
    };
  
    const onMouseUp = (event) => {
      if (isDrawing.current) {
        if (!isErasing && currentShape !== 'pencil' && shapeStartPos.current) {
          const endPos = {
            x: event.clientX - canvasBound.left,
            y: event.clientY - canvasBound.top
          };
          if (undoStack.length > 0) {
            restoreCanvasState(context, undoStack[undoStack.length - 1]);
          }
          drawShape(shapeStartPos.current, endPos);
          shapeStartPos.current = null;
        }
        isDrawing.current = false;
        saveCanvasState(canvas);
      }
      lastPos.current = { x: 0, y: 0 };
    };
  
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseout', onMouseUp);
  
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseout', onMouseUp);
    };
  }, [undoStack, lineWidth, currentColor, isErasing, currentShape]);
  
  

  const handleUndo = () => {
    if (socket.current !== null) {
      const message = JSON.stringify({ message: 'undo' });
      socket.current.send(message);
    }
  };
  
  const handleRedo = () => {
    if (socket.current !== null) {
      const message = JSON.stringify({ message: 'redo' });
      socket.current.send(message);
    }
  };
  const handleClear = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    saveCanvasState(canvas);
    if(socket.current !== null) {
      const message = JSON.stringify({ message: 'clear' });
      socket.current.send(message);
    }
  };
  const handleSave= () => {
    const dataUrl=undoStack[undoStack.length-1];
    const link=document.createElement("a");
    link.href=dataUrl;
    link.download="canvas-download.png";
    link.click();
  }

  return (
    <>
      <Box height="100vh" width="100vw" bgcolor="gray" display="flex" flexDirection="column" justifyContent='center' alignItems='center'>
        <Stack 
          direction="row" 
          spacing={2} 
          borderRadius={2}
          mt={2}
          alignItems="center" 
          sx={{ 
            width: '97.5%', 
            bgcolor: 'white', 
            py: 1, 
            px: 2, 
            justifyContent: 'space-between' 
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            {colors.map((color) => (
              <Tooltip key={color.name} title={color.name}>
                <IconButton
                  onClick={() => {
                    setCurrentColor(color.hex);
                    setIsErasing(false);
                  }}
                  sx={{ 
                    bgcolor: color.hex, 
                    width: 25, 
                    height: 25,
                    border: currentColor === color.hex ? '3px solid black' : 'none',
                    '&:hover': {
                      bgcolor: color.hex,
                      opacity: 0.8
                    }
                  }}
                />
              </Tooltip>
            ))}
            <Stack width={180} direction="row" spacing={1} alignItems="center" ml={4}>
              <Typography mr={2} mt={0.25}>Size:</Typography>
              <Slider 
                value={lineWidth} 
                onChange={(e) => setLineWidth(e.target.value)} 
                defaultValue={5} 
                min={1} 
                max={30} 
              />
              <Typography ml={2} mt={0.25}>{lineWidth}</Typography>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" ml={4}>
            <Typography>Shape:</Typography>
            <Tooltip title="Pencil">
              <IconButton
                onClick={() => {
                  setCurrentShape('pencil');
                  setIsErasing(false);
                }}
                color={currentShape === 'pencil' ? 'primary' : 'default'}
                disabled={socket.current===null}
              >
                <LuPencil />
              </IconButton>
            </Tooltip>
            <Tooltip title="Line">
              <IconButton
                onClick={() => {
                  setCurrentShape('line');
                  setIsErasing(false);
                }}
                color={currentShape === 'line' ? 'primary' : 'default'}
                disabled={socket.current===null}
              >
                <LuMinus />
              </IconButton>
            </Tooltip>
            <Tooltip title="Circle">
              <IconButton
                onClick={() => {
                  setCurrentShape('circle');
                  setIsErasing(false);
                }}
                color={currentShape === 'circle' ? 'primary' : 'default'}
                disabled={socket.current===null}
              >
                <LuCircle />
              </IconButton>
            </Tooltip>
            <Tooltip title="Rectangle">
              <IconButton
                onClick={() => {
                  setCurrentShape('rectangle');
                  setIsErasing(false);
                }}
                color={currentShape === 'rectangle' ? 'primary' : 'default'}
                disabled={socket.current===null}
              >
                <LuSquare />
              </IconButton>
            </Tooltip>
          </Stack>
          <Stack marginLeft="auto" marginRight="auto" display="flex" direction="row" spacing={1}>
              <TextField
              size="small"
              marginRight={1}
              label={!connectedToSocket?"Enter Room Number":"Room Number"}
              value={roomNumber} 
              slotProps={{
                input:{
                  readOnly:(connectedToSocket^false),
                }
              }}
              onChange={(e)=>{
                const currentValue=e.target.value;
                currentRoom.current=currentValue;
                setRoomNumber(e.target.value);
              }}
              />
              <Button 
                size='small' 
                variant="contained" 
                color={!connectedToSocket?"success":"error"}
                onClick={()=>{
                  if(roomNumber!==""){
                    if(socket.current===null){
                      connectToWebSocket();
                    }else{
                      disconnectFromWeb();
                      socket.current=null;
                    }
                  }
                }}>
                  {!connectedToSocket?"Connect":"Disconnect"}
              </Button>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Save">
              <IconButton 
                onClick={handleSave} 
                disabled={undoStack.length <= 2||socket.current===null}
              >
                <LuSave/>
              </IconButton>
            </Tooltip>
            <Tooltip title={isErasing ? "Drawing Mode" : "Eraser Mode"}>
              <IconButton 
                color={isErasing ? "primary" : "default"}
                onClick={() => {
                  setIsErasing(!isErasing);
                  if (!isErasing) {
                    setCurrentShape('pencil'); 
                  }
                }}
                disabled={undoStack.length <= 2||socket.current===null}
              >
                <LuEraser />
              </IconButton>
            </Tooltip>
            <Tooltip title="Undo">
              <IconButton 
                onClick={handleUndo} 
                disabled={undoStack.length <= 2||socket.current===null}
              >
                <LuUndo />
              </IconButton>
            </Tooltip>
            <Tooltip title="Redo">
              <IconButton 
                onClick={handleRedo} 
                disabled={redoStack.length === 0||socket.current===null}
              >
                <LuRedo/>
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear Canvas">
              <IconButton  onClick={handleClear} disabled={undoStack.length <= 2||socket.current===null}>
                <ClearIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <Box 
          flex={1} 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          bgcolor="white" 
          width="97.5%"
          height='85%'
          m={2}
          onMouseDown={handleDrawerStart}
        >
          <canvas ref={canvasRef} style={{maxWidth: '100%', maxHeight: '100%'}} />
        </Box>
        {socket.current===null?(<Snackbar
          open={openSnackbar}
          message={`You are not connected to a room. Do you want to join room ?`}
          action={
            <>
              <Button color="secondary" size="small" onClick={handleJoinRoom}>
                Join Room
              </Button>
              <Button color="secondary" size="small" onClick={handleCancelJoin}>
                Cancel
              </Button>
            </>
          }
        />):(<></>)}
      </Box>
    </>
  );
}

export default App;