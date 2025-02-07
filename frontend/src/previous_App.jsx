import { Box, IconButton, Slider, Stack, Tooltip, Typography } from '@mui/material';
import ClearIcon from '@mui/icons-material/CleaningServices';
import { LuUndo, LuRedo, LuEraser, LuSave } from "react-icons/lu";
import { useEffect, useRef, useState } from 'react';
import './App.css';

function App() {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [lineWidth, setLineWidth] = useState(5);
  const [currentColor, setCurrentColor] = useState('purple');
  const [isErasing, setIsErasing] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const contextRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState('default-room');

  const colors = [
    { name: 'Purple', hex: 'purple' },
    { name: 'Blue', hex: '#1e88e5' },
    { name: 'Green', hex: '#4caf50' },
    { name: 'Red', hex: '#f44336' }
  ];
  
  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/${roomId}`);
    
    ws.onopen = () => {
      console.log('Connected to WebSocket');
      setSocket(ws);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket closed:', event);
    };
    ws.onmessage = (event) => {
      console.log('Received WebSocket message:', event.data);
      const data = JSON.parse(event.data);
      
      switch (data.action) {
        case 'canvas_updated':
          console.log('Updating canvas with:', data);
          setUndoStack(data.undo_stack);
          setRedoStack(data.redo_stack);
          if (data.undo_stack.length > 0) {
            restoreCanvasState(data.undo_stack[data.undo_stack.length - 1]);
          }
          break;
          
        case 'canvas_cleared':
          { console.log('Clearing canvas');
          setUndoStack(data.undo_stack);
          setRedoStack([]);
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          context.clearRect(0, 0, canvas.width, canvas.height);
          break; }
          
        default:
          console.log('Unknown action:', data.action);
      }
    };y   // Fetch initial canvas state
    fetch(`http://127.0.0.1:8000/api/canvas/${roomId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Received initial canvas state:', data);
      setUndoStack(data.undo_stack);
      setRedoStack(data.redo_stack);
      if (data.undo_stack.length > 0) {
        restoreCanvasState(data.undo_stack[data.undo_stack.length - 1]);
      }
    })
    .catch(error => {
      console.error('Error fetching canvas state:', error);
    });
      
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [roomId]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    contextRef.current = canvas.getContext('2d');
    const canvasWidth = canvas.parentElement.offsetWidth;
    const canvasHeight = canvas.parentElement.offsetHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    contextRef.current.fillStyle = 'white';
    contextRef.current.fillRect(0, 0, canvas.width, canvas.height);
    saveCanvasState(canvas);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
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

    const onMouseDown = (event) => {
      if (event.button === 0) {
        isDrawing.current = true;
        lastPos.current = { 
          x: event.clientX - canvasBound.left, 
          y: event.clientY - canvasBound.top 
        };
      }
    };

    const onMouseUp = () => {
      if (isDrawing.current) {
        isDrawing.current = false;
        saveCanvasState(canvas);
      }
      lastPos.current = { x: 0, y: 0 };
    };

    const draw = (x, y) => {
      context.beginPath();
      context.moveTo(lastPos.current.x, lastPos.current.y);
      context.lineTo(x, y);
      context.strokeStyle = isErasing ? 'white' : currentColor;
      context.lineWidth = lineWidth;
      context.lineCap = isErasing ? 'square' : 'round';
      context.lineJoin = isErasing ? 'miter' : 'round';
      context.stroke();
      lastPos.current = { x, y };
    };

    const onMouseMove = (event) => {
      if (!isDrawing.current) return;
      const x = event.clientX - canvasBound.left;
      const y = event.clientY - canvasBound.top;
      draw(x, y);
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
  }, [lineWidth, currentColor, isErasing]);

  const saveCanvasState = (canvas) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempContext = tempCanvas.getContext('2d');
    tempContext.fillStyle = 'white';
    tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempContext.drawImage(canvas, 0, 0);
    const imgUrl = tempCanvas.toDataURL();
    const newUndoStack = [...undoStack, imgUrl];
    
    setUndoStack(newUndoStack);
    setRedoStack([]);
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log('Sending canvas update to server');
      const message = {
        action: 'update_canvas',
        undo_stack: newUndoStack,
        redo_stack: []
      };
      console.log('Update message:', message);
      socket.send(JSON.stringify(message));
    } else {
      console.log('Socket not ready:', socket?.readyState);
    }
  };

  const restoreCanvasState = (imgUrl) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    const img = new Image();
    img.src = imgUrl;
    img.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0);
    };
  };

  const handleUndo = () => {
    if (undoStack.length <= 1) return;
    const currentState = undoStack[undoStack.length - 1];
    const newRedoStack = [currentState, ...redoStack];
    const newUndoStack = undoStack.slice(0, -1);
    setUndoStack(newUndoStack);
    setRedoStack(newRedoStack);
    restoreCanvasState(newUndoStack[newUndoStack.length - 1]);
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        action: 'update_canvas',
        undo_stack: newUndoStack,
        redo_stack: newRedoStack
      }));
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const stateToRedo = redoStack[0];
    const newUndoStack = [...undoStack, stateToRedo];
    const newRedoStack = redoStack.slice(1);
    setUndoStack(newUndoStack);
    setRedoStack(newRedoStack);
    restoreCanvasState(stateToRedo);
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        action: 'update_canvas',
        undo_stack: newUndoStack,
        redo_stack: newRedoStack
      }));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    const newUndoStack = [canvas.toDataURL()];
    setUndoStack(newUndoStack);
    setRedoStack([]);
    
    if (socket) {
      socket.send(JSON.stringify({
        action: 'clear_canvas',
        undo_stack: newUndoStack,
        redo_stack: []
      }));
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
            <Box width={180} ml={10} mt={2} display='flex' flexDirection='row'>
              <Typography mr={2} mt={0.25}>Size:</Typography>
              <Slider 
                value={lineWidth} 
                onChange={(e) => setLineWidth(e.target.value)} 
                defaultValue={5} 
                min={1} 
                max={30} 
              />
              <Typography ml={2} mt={0.25}>{lineWidth}</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Save">
              <IconButton 
                onClick={handleSave} 
                disabled={undoStack.length <= 2}
              >
                <LuSave/>
              </IconButton>
            </Tooltip>
            <Tooltip title={isErasing ? "Drawing Mode" : "Eraser Mode"}>
              <IconButton 
                color={isErasing ? "primary" : "default"}
                onClick={() => setIsErasing(!isErasing)}
                disabled={undoStack.length <= 2}
              >
                <LuEraser />
              </IconButton>
            </Tooltip>
            <Tooltip title="Undo">
              <IconButton 
                onClick={handleUndo} 
                disabled={undoStack.length <= 2}
              >
                <LuUndo />
              </IconButton>
            </Tooltip>
            <Tooltip title="Redo">
              <IconButton 
                onClick={handleRedo} 
                disabled={redoStack.length === 0}
              >
                <LuRedo/>
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear Canvas">
              <IconButton  onClick={handleClear} disabled={undoStack.length <= 2}>
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
        >
          <canvas ref={canvasRef} style={{maxWidth: '100%', maxHeight: '100%'}} />
        </Box>
      </Box>
    </>
  );
}

export default App;