const { useState, useEffect, useRef } = React;
const { BookOpen, Home, Plus, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Menu, X } = lucide;

const PDFReaderApp = () => {
  const [view, setView] = useState('home');
  const [pdfUrl, setPdfUrl] = useState('');
  const [savedPDFs, setSavedPDFs] = useState([]);
  const [currentPDF, setCurrentPDF] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('pdfLibrary') || '[]');
    setSavedPDFs(stored);
  }, []);

  const playPageFlipSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch(e) {
      console.log('Audio not supported');
    }
  };

  const loadPDF = async (url) => {
    try {
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      await renderPage(1, pdf);
      
      const existingPDF = savedPDFs.find(p => p.url === url);
      
      if (!existingPDF) {
        const newPDF = {
          id: Date.now(),
          url: url,
          title: `PDF ${savedPDFs.length + 1}`,
          addedDate: new Date().toISOString(),
        };
        
        const updatedPDFs = [...savedPDFs, newPDF];
        setSavedPDFs(updatedPDFs);
        localStorage.setItem('pdfLibrary', JSON.stringify(updatedPDFs));
        setCurrentPDF(newPDF);
      } else {
        setCurrentPDF(existingPDF);
      }
      
      setView('reader');
    } catch (error) {
      alert('PDF লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে সঠিক লিংক দিন।');
      console.error(error);
    }
  };

  const renderPage = async (pageNum, pdf = pdfDocRef.current) => {
    if (!pdf) return;
    
    const page = await pdf.getPage(pageNum);
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    const viewport = page.getViewport({ scale: zoom * 1.5 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
  };

  const changePage = async (direction) => {
    if (isFlipping) return;
    
    let newPage = currentPage;
    if (direction === 'next' && currentPage < totalPages) {
      newPage = currentPage + 1;
      setFlipDirection('next');
    } else if (direction === 'prev' && currentPage > 1) {
      newPage = currentPage - 1;
      setFlipDirection('prev');
    } else {
      return;
    }
    
    setIsFlipping(true);
    playPageFlipSound();
    
    setTimeout(async () => {
      setCurrentPage(newPage);
      await renderPage(newPage);
      setIsFlipping(false);
    }, 600);
  };

  const handleZoom = (direction) => {
    if (direction === 'in' && zoom < 2) {
      const newZoom = zoom + 0.2;
      setZoom(newZoom);
      renderPage(currentPage);
    } else if (direction === 'out' && zoom > 0.6) {
      const newZoom = zoom - 0.2;
      setZoom(newZoom);
      renderPage(currentPage);
    }
  };

  const openExistingPDF = async (pdf) => {
    setCurrentPDF(pdf);
    await loadPDF(pdf.url);
    setDrawerOpen(false);
  };

  const handleAddPDF = () => {
    if (pdfUrl.trim()) {
      loadPDF(pdfUrl);
      setPdfUrl('');
    }
  };

  const deletePDF = (id, e) => {
    e.stopPropagation();
    const updatedPDFs = savedPDFs.filter(pdf => pdf.id !== id);
    setSavedPDFs(updatedPDFs);
    localStorage.setItem('pdfLibrary', JSON.stringify(updatedPDFs));
  };

  return React.createElement('div', { className: "min-h-screen bg-gradient-to-br from-amber-50 to-orange-100" },
    React.createElement('style', null, `
      @keyframes flip {
        0% { transform: perspective(1000px) rotateY(0deg); }
        50% { transform: perspective(1000px) rotateY(90deg); }
        100% { transform: perspective(1000px) rotateY(0deg); }
      }
      .animate-flip { animation: flip 0.6s ease-in-out; }
    `),
    
    // Header
    React.createElement('div', { className: "bg-gradient-to-r from-orange-600 to-red-600 text-white p-4 shadow-lg" },
      React.createElement('div', { className: "max-w-7xl mx-auto flex items-center justify-between" },
        React.createElement('div', { className: "flex items-center gap-3" },
          React.createElement('button', {
            onClick: () => setDrawerOpen(!drawerOpen),
            className: "p-2 hover:bg-white/20 rounded-lg transition-all"
          }, React.createElement(Menu, { size: 24 })),
          React.createElement(BookOpen, { size: 32 }),
          React.createElement('h1', { className: "text-2xl font-bold" }, 'বাংলা PDF রিডার')
        ),
        view === 'reader' && React.createElement('button', {
          onClick: () => setView('home'),
          className: "flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition-all"
        },
          React.createElement(Home, { size: 20 }),
          React.createElement('span', null, 'হোম')
        )
      )
    ),

    // Drawer
    React.createElement('div', {
      className: `fixed inset-y-0 left-0 w-80 bg-white shadow-2xl transform transition-transform duration-300 z-50 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`
    },
      React.createElement('div', { className: "p-4 border-b border-gray-200 flex justify-between items-center" },
        React.createElement('h2', { className: "text-xl font-bold text-gray-800" }, 'আমার লাইব্রেরি'),
        React.createElement('button', {
          onClick: () => setDrawerOpen(false),
          className: "p-2 hover:bg-gray-100 rounded"
        }, React.createElement(X, { size: 24 }))
      ),
      React.createElement('div', { className: "p-4 overflow-y-auto h-full pb-20" },
        savedPDFs.length === 0 ?
          React.createElement('p', { className: "text-gray-500 text-center mt-10" }, 'কোনো PDF সংরক্ষিত নেই') :
          React.createElement('div', { className: "grid grid-cols-2 gap-4" },
            savedPDFs.map(pdf =>
              React.createElement('div', { key: pdf.id, className: "relative" },
                React.createElement('div', {
                  onClick: () => openExistingPDF(pdf),
                  className: "cursor-pointer group"
                },
                  React.createElement('div', {
                    className: "aspect-[3/4] bg-gradient-to-br from-orange-100 to-red-100 rounded-lg shadow-md group-hover:shadow-xl transition-all border-2 border-orange-200 flex items-center justify-center"
                  }, React.createElement(BookOpen, { size: 48, className: "text-orange-600" })),
                  React.createElement('p', { className: "mt-2 text-sm font-medium text-gray-700 truncate" }, pdf.title),
                  React.createElement('p', { className: "text-xs text-gray-500" }, new Date(pdf.addedDate).toLocaleDateString('bn-BD'))
                ),
                React.createElement('button', {
                  onClick: (e) => deletePDF(pdf.id, e),
                  className: "absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                }, '×')
              )
            )
          )
      )
    ),

    // Overlay
    drawerOpen && React.createElement('div', {
      className: "fixed inset-0 bg-black/50 z-40",
      onClick: () => setDrawerOpen(false)
    }),

    // Main Content
    React.createElement('div', { className: "max-w-7xl mx-auto p-6" },
      view === 'home' && React.createElement('div', { className: "max-w-2xl mx-auto" },
        React.createElement('div', { className: "bg-white rounded-2xl shadow-2xl p-8 mt-10" },
          React.createElement('div', { className: "text-center mb-8" },
            React.createElement('div', { className: "inline-block p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-full mb-4" },
              React.createElement(BookOpen, { size: 48, className: "text-white" })
            ),
            React.createElement('h2', { className: "text-3xl font-bold text-gray-800 mb-2" }, 'নতুন PDF যোগ করুন'),
            React.createElement('p', { className: "text-gray-600" }, 'PDF এর লিংক দিয়ে পড়া শুরু করুন')
          ),
          React.createElement('div', { className: "space-y-4" },
            React.createElement('input', {
              type: "text",
              value: pdfUrl,
              onChange: (e) => setPdfUrl(e.target.value),
              placeholder: "PDF এর লিংক এখানে পেস্ট করুন",
              className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-lg",
              onKeyPress: (e) => e.key === 'Enter' && handleAddPDF()
            }),
            React.createElement('button', {
              onClick: handleAddPDF,
              className: "w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-lg font-bold text-lg hover:from-orange-700 hover:to-red-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            },
              React.createElement(Plus, { size: 24 }),
              'PDF খুলুন'
            )
          ),
          React.createElement('div', { className: "mt-8 p-4 bg-amber-50 rounded-lg border border-amber-200" },
            React.createElement('p', { className: "text-sm text-amber-800" },
              '💡 ',
              React.createElement('strong', null, 'টিপস:'),
              ' যেকোনো PDF লিংক ব্যবহার করতে পারবেন। একবার খুললে পরেরবার আর লিংক লাগবে না!'
            )
          )
        ),
        savedPDFs.length > 0 && React.createElement('div', { className: "mt-10" },
          React.createElement('h3', { className: "text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2" },
            React.createElement(BookOpen, { className: "text-orange-600" }),
            'সংরক্ষিত PDF সমূহ'
          ),
          React.createElement('div', { className: "grid grid-cols-2 md:grid-cols-4 gap-6" },
            savedPDFs.map(pdf =>
              React.createElement('div', {
                key: pdf.id,
                onClick: () => openExistingPDF(pdf),
                className: "cursor-pointer group"
              },
                React.createElement('div', {
                  className: "aspect-[3/4] bg-gradient-to-br from-orange-100 to-red-100 rounded-xl shadow-lg group-hover:shadow-2xl transition-all border-2 border-orange-200 group-hover:border-orange-400 flex items-center justify-center transform group-hover:scale-105"
                }, React.createElement(BookOpen, { size: 64, className: "text-orange-600" })),
                React.createElement('p', { className: "mt-3 text-center font-medium text-gray-700 truncate" }, pdf.title),
                React.createElement('p', { className: "text-sm text-center text-gray-500" }, new Date(pdf.addedDate).toLocaleDateString('bn-BD'))
              )
            )
          )
        )
      ),

      view === 'reader' && React.createElement('div', { className: "bg-white rounded-2xl shadow-2xl p-6" },
        React.createElement('div', { className: "flex items-center justify-between mb-6 pb-4 border-b border-gray-200" },
          React.createElement('div', { className: "flex items-center gap-4" },
            React.createElement('button', {
              onClick: () => changePage('prev'),
              disabled: currentPage === 1 || isFlipping,
              className: "p-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            }, React.createElement(ChevronLeft, { size: 24 })),
            React.createElement('span', { className: "text-lg font-bold text-gray-700" },
              `পৃষ্ঠা ${currentPage} / ${totalPages}`
            ),
            React.createElement('button', {
              onClick: () => changePage('next'),
              disabled: currentPage === totalPages || isFlipping,
              className: "p-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            }, React.createElement(ChevronRight, { size: 24 }))
          ),
          React.createElement('div', { className: "flex items-center gap-2" },
            React.createElement('button', {
              onClick: () => handleZoom('out'),
              className: "p-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all"
            }, React.createElement(ZoomOut, { size: 20 })),
            React.createElement('span', { className: "text-sm font-medium text-gray-600 w-16 text-center" },
              `${Math.round(zoom * 100)}%`
            ),
            React.createElement('button', {
              onClick: () => handleZoom('in'),
              className: "p-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all"
            }, React.createElement(ZoomIn, { size: 20 }))
          )
        ),
        React.createElement('div', { className: "relative overflow-auto max-h-[calc(100vh-250px)] bg-gray-100 rounded-lg flex items-center justify-center" },
          React.createElement('div', { className: `relative transition-all duration-600 ${isFlipping ? 'animate-flip' : ''}` },
            React.createElement('canvas', {
              ref: canvasRef,
              className: "shadow-2xl",
              style: { transformStyle: 'preserve-3d' }
            })
          )
        )
      )
    )
  );
};

// Lucide icons component stubs
const lucide = {
  BookOpen: ({ size, className }) => React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className
  },
    React.createElement('path', { d: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" }),
    React.createElement('path', { d: "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" })
  ),
  Home: ({ size }) => React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  },
    React.createElement('path', { d: "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }),
    React.createElement('polyline', { points: "9 22 9 12 15 12 15 22" })
  ),
  Plus: ({ size }) => React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  },
    React.createElement('line', { x1: "12", y1: "5", x2: "12", y2: "19" }),
    React.createElement('line', { x1: "5", y1: "12", x2: "19", y2: "12" })
  ),
  Menu: ({ size }) => React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  },
    React.createElement('line', { x1: "3", y1: "6", x2: "21", y2: "6" }),
    React.createElement('line', { x1: "3", y1: "12", x2: "21", y2: "12" }),
    React.createElement('line', { x1: "3", y1: "18", x2: "21", y2: "18" })
  ),
  X: ({ size }) => React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  },
    React.createElement('line', { x1: "18", y1: "6", x2: "6", y2: "18" }),
    React.createElement('line', { x1: "6", y1: "6", x2: "18", y2: "18" })
  ),
  ZoomIn: ({ size }) => React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  },
    React.createElement('circle', { cx: "11", cy: "11", r: "8" }),
    React.createElement('line', { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }),
    React.createElement('line', { x1: "11", y1: "8", x2: "11", y2: "14" }),
    React.createElement('line', { x1: "8", y1: "11", x2: "14", y2: "11" })
  ),
  ZoomOut: ({ size }) => React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  },
    React.createElement('circle', { cx: "11", cy: "11", r: "8" }),
    React.createElement('line', { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }),
    React.createElement('line', { x1: "8", y1: "11", x2: "14", y2: "11" })
  ),
  ChevronLeft: ({ size }) => React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  },
    React.createElement('polyline', { points: "15 18 9 12 15 6" })
  ),
  ChevronRight: ({ size }) => React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2"
  },
    React.createElement('polyline', { points: "9 18 15 12 9 6" })
  )
};

ReactDOM.render(React.createElement(PDFReaderApp), document.getElementById('root'));
