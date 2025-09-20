import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Upload, 
  Code, 
  Image as ImageIcon,
  BookOpen,
  FileText,
  Calculator,
  CheckCircle,
  XCircle,
  Target,
  Layers,
  Shuffle,
  Eye,
  EyeOff,
  Move,
  GripVertical
} from 'lucide-react';
import { Editor } from '@monaco-editor/react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import ReactMarkdown from 'react-markdown';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Mathematical Expression Input Component
const MathExpressionInput = ({ value, onChange, placeholder = "Enter mathematical expression" }) => {
  const [isPreview, setIsPreview] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    setError(null);
  };

  const renderMath = (expression) => {
    try {
      if (expression.includes('\\[') || expression.includes('$$')) {
        return <BlockMath math={expression} />;
      } else {
        return <InlineMath math={expression} />;
      }
    } catch (err) {
      setError('Invalid LaTeX expression');
      return <span className="text-red-500">Invalid expression</span>;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Mathematical Expression
        </label>
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900"
        >
          {isPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
          {isPreview ? 'Edit' : 'Preview'}
        </button>
      </div>
      
      {isPreview ? (
        <div className="p-3 border border-gray-300 rounded-md bg-gray-50 min-h-[40px]">
          {value ? renderMath(value) : <span className="text-gray-400">{placeholder}</span>}
        </div>
      ) : (
        <div>
          <textarea
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">
            Use LaTeX syntax (e.g., \frac{1}{2}, x^2, \sqrt{4})
          </p>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
};

// Code Editor Component
const CodeEditor = ({ language, value, onChange, height = 300 }) => {
  const [theme, setTheme] = useState('vs-dark');

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <div className="bg-gray-100 px-3 py-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{language}</span>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="text-xs border border-gray-300 rounded px-2 py-1"
        >
          <option value="vs-dark">Dark</option>
          <option value="vs-light">Light</option>
        </select>
      </div>
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={onChange}
        theme={theme}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          automaticLayout: true,
        }}
      />
    </div>
  );
};

// Image Upload Component with Preview
const ImageUpload = ({ images, onImagesChange, maxImages = 5 }) => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('alt', file.name);
        formData.append('caption', '');

        const response = await fetch('/api/questions/images', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) throw new Error('Upload failed');
        return response.json();
      });

      const results = await Promise.all(uploadPromises);
      const newImages = results.map(result => ({
        url: result.imageUrl,
        alt: result.alt,
        caption: result.caption
      }));

      onImagesChange([...images, ...newImages].slice(0, maxImages));
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const updateImageCaption = (index, caption) => {
    const newImages = [...images];
    newImages[index].caption = caption;
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Images ({images.length}/{maxImages})
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 cursor-pointer transition-colors"
        >
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Click to upload images or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG, GIF up to 10MB each
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image.url}
                alt={image.alt}
                className="w-full h-32 object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <input
                type="text"
                value={image.caption}
                onChange={(e) => updateImageCaption(index, e.target.value)}
                placeholder="Image caption"
                className="mt-2 block w-full text-xs border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Drag and Drop Component
const DragDropComponent = ({ items, onItemsChange, type = 'drag-drop' }) => {
  const [newItem, setNewItem] = useState({ content: '', category: '', correctPosition: 0 });

  const addItem = () => {
    if (newItem.content.trim()) {
      onItemsChange([...items, { ...newItem, id: Date.now().toString() }]);
      setNewItem({ content: '', category: '', correctPosition: 0 });
    }
  };

  const removeItem = (id) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    onItemsChange(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={newItem.content}
          onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
          placeholder="Item content"
          className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <input
          type="text"
          value={newItem.category}
          onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
          placeholder="Category"
          className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <input
          type="number"
          value={newItem.correctPosition}
          onChange={(e) => setNewItem({ ...newItem, correctPosition: parseInt(e.target.value) })}
          placeholder="Position"
          className="w-20 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="items">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2 min-h-[100px] border border-gray-300 rounded-md p-4"
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-center space-x-2 p-2 bg-white border rounded-md ${
                        snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'
                      }`}
                    >
                      <div {...provided.dragHandleProps}>
                        <GripVertical className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">{item.content}</span>
                        <span className="text-xs text-gray-500 ml-2">({item.category})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

// Hotspot Component
const HotspotComponent = ({ areas, onAreasChange }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentArea, setCurrentArea] = useState(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const startDrawing = (e) => {
    if (!isDrawing) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentArea({ x, y, width: 0, height: 0, isCorrect: true, explanation: '' });
  };

  const draw = (e) => {
    if (!isDrawing || !currentArea) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentArea({
      ...currentArea,
      width: x - currentArea.x,
      height: y - currentArea.y
    });
  };

  const stopDrawing = () => {
    if (currentArea && currentArea.width > 10 && currentArea.height > 10) {
      onAreasChange([...areas, currentArea]);
    }
    setCurrentArea(null);
    setIsDrawing(false);
  };

  const removeArea = (index) => {
    onAreasChange(areas.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Hotspot Areas
        </label>
        <button
          type="button"
          onClick={() => setIsDrawing(!isDrawing)}
          className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
            isDrawing 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {isDrawing ? 'Stop Drawing' : 'Start Drawing'}
        </button>
      </div>

      <div className="relative border border-gray-300 rounded-md overflow-hidden">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        {imageRef.current && (
          <img
            ref={imageRef}
            src={imageRef.current.src}
            alt="Hotspot image"
            className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
          />
        )}
      </div>

      <div className="space-y-2">
        {areas.map((area, index) => (
          <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
            <div className="flex-1">
              <span className="text-sm">
                Area {index + 1}: ({area.x}, {area.y}) - {area.width}×{area.height}
              </span>
              <div className="flex items-center space-x-2 mt-1">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={area.isCorrect}
                    onChange={(e) => {
                      const newAreas = [...areas];
                      newAreas[index].isCorrect = e.target.checked;
                      onAreasChange(newAreas);
                    }}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Correct</span>
                </label>
                <input
                  type="text"
                  value={area.explanation}
                  onChange={(e) => {
                    const newAreas = [...areas];
                    newAreas[index].explanation = e.target.value;
                    onAreasChange(newAreas);
                  }}
                  placeholder="Explanation"
                  className="flex-1 text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeArea(index)}
              className="text-red-600 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Matching Pairs Component
const MatchingPairsComponent = ({ pairs, onPairsChange }) => {
  const [newPair, setNewPair] = useState({ left: '', right: '', explanation: '' });

  const addPair = () => {
    if (newPair.left.trim() && newPair.right.trim()) {
      onPairsChange([...pairs, newPair]);
      setNewPair({ left: '', right: '', explanation: '' });
    }
  };

  const removePair = (index) => {
    onPairsChange(pairs.filter((_, i) => i !== index));
  };

  const updatePair = (index, field, value) => {
    const newPairs = [...pairs];
    newPairs[index][field] = value;
    onPairsChange(newPairs);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={newPair.left}
          onChange={(e) => setNewPair({ ...newPair, left: e.target.value })}
          placeholder="Left item"
          className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <input
          type="text"
          value={newPair.right}
          onChange={(e) => setNewPair({ ...newPair, right: e.target.value })}
          placeholder="Right item"
          className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <input
          type="text"
          value={newPair.explanation}
          onChange={(e) => setNewPair({ ...newPair, explanation: e.target.value })}
          placeholder="Explanation"
          className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <button
          type="button"
          onClick={addPair}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        {pairs.map((pair, index) => (
          <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
            <div className="flex-1 grid grid-cols-3 gap-2">
              <input
                type="text"
                value={pair.left}
                onChange={(e) => updatePair(index, 'left', e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <input
                type="text"
                value={pair.right}
                onChange={(e) => updatePair(index, 'right', e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <input
                type="text"
                value={pair.explanation}
                onChange={(e) => updatePair(index, 'explanation', e.target.value)}
                placeholder="Explanation"
                className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => removePair(index)}
              className="text-red-600 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Fill in the Blank Component
const FillBlankComponent = ({ blanks, onBlanksChange }) => {
  const [newBlank, setNewBlank] = useState({ position: 0, correctAnswer: '', alternatives: [] });

  const addBlank = () => {
    if (newBlank.correctAnswer.trim()) {
      onBlanksChange([...blanks, { ...newBlank, id: Date.now().toString() }]);
      setNewBlank({ position: 0, correctAnswer: '', alternatives: [] });
    }
  };

  const removeBlank = (id) => {
    onBlanksChange(blanks.filter(blank => blank.id !== id));
  };

  const updateBlank = (id, field, value) => {
    const newBlanks = blanks.map(blank => 
      blank.id === id ? { ...blank, [field]: value } : blank
    );
    onBlanksChange(newBlanks);
  };

  const addAlternative = (blankId) => {
    const newBlanks = blanks.map(blank => 
      blank.id === blankId 
        ? { ...blank, alternatives: [...blank.alternatives, ''] }
        : blank
    );
    onBlanksChange(newBlanks);
  };

  const updateAlternative = (blankId, altIndex, value) => {
    const newBlanks = blanks.map(blank => 
      blank.id === blankId 
        ? { 
            ...blank, 
            alternatives: blank.alternatives.map((alt, i) => i === altIndex ? value : alt)
          }
        : blank
    );
    onBlanksChange(newBlanks);
  };

  const removeAlternative = (blankId, altIndex) => {
    const newBlanks = blanks.map(blank => 
      blank.id === blankId 
        ? { 
            ...blank, 
            alternatives: blank.alternatives.filter((_, i) => i !== altIndex)
          }
        : blank
    );
    onBlanksChange(newBlanks);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="number"
          value={newBlank.position}
          onChange={(e) => setNewBlank({ ...newBlank, position: parseInt(e.target.value) })}
          placeholder="Position"
          className="w-20 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <input
          type="text"
          value={newBlank.correctAnswer}
          onChange={(e) => setNewBlank({ ...newBlank, correctAnswer: e.target.value })}
          placeholder="Correct answer"
          className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <button
          type="button"
          onClick={addBlank}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {blanks.map((blank) => (
          <div key={blank.id} className="p-3 bg-gray-50 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Position {blank.position}</span>
              <button
                type="button"
                onClick={() => removeBlank(blank.id)}
                className="text-red-600 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700">Correct Answer</label>
                <input
                  type="text"
                  value={blank.correctAnswer}
                  onChange={(e) => updateBlank(blank.id, 'correctAnswer', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700">Alternative Answers</label>
                  <button
                    type="button"
                    onClick={() => addAlternative(blank.id)}
                    className="text-xs text-indigo-600 hover:text-indigo-500"
                  >
                    + Add Alternative
                  </button>
                </div>
                <div className="mt-1 space-y-1">
                  {blank.alternatives.map((alt, altIndex) => (
                    <div key={altIndex} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={alt}
                        onChange={(e) => updateAlternative(blank.id, altIndex, e.target.value)}
                        className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeAlternative(blank.id, altIndex)}
                        className="text-red-600 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export {
  MathExpressionInput,
  CodeEditor,
  ImageUpload,
  DragDropComponent,
  HotspotComponent,
  MatchingPairsComponent,
  FillBlankComponent
};
