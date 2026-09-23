import { useState, useEffect, useRef } from 'react'
import { Folder, Image as ImageIcon, FileText, UploadCloud, Search, Trash2, Copy, CheckCircle2, Download, ExternalLink, X } from 'lucide-react'

// Interface for media items
interface MediaItem {
  id: string
  name: string
  type: string
  size: string
  url: string
  date: string
  category: string
}

export default function MediaLibraryTab() {
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState<{ name: string; size: string; progress: number } | null>(null)
  const [notification, setNotification] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load from localStorage on mount (Simulated DB)
  useEffect(() => {
    const saved = localStorage.getItem('sa_global_media')
    if (saved) {
      try {
        setMediaList(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse media list')
      }
    }
  }, [])

  // Save to localStorage when updated (with QuotaExceededError fallback)
  const saveMedia = (newList: MediaItem[]) => {
    setMediaList(newList)
    try {
      localStorage.setItem('sa_global_media', JSON.stringify(newList))
    } catch (e) {
      console.warn('localStorage quota exceeded, storing lightweight items', e)
      const lightList = newList.map(item => ({
        ...item,
        url: item.url && item.url.length > 300000 ? '' : item.url
      }))
      try {
        localStorage.setItem('sa_global_media', JSON.stringify(lightList))
      } catch (err) {}
    }
  }

  const showNotify = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3000)
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const formattedSize = formatSize(file.size)
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'
    const isImg = file.type.startsWith('image/')

    setIsUploading(true)
    setUploadingFile({ name: file.name, size: formattedSize, progress: 10 })

    let currentProgress = 10
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 20) + 15
      if (currentProgress >= 95) {
        currentProgress = 95
        clearInterval(interval)
      }
      setUploadingFile(prev => (prev ? { ...prev, progress: currentProgress } : null))
    }, 100)

    setTimeout(() => {
      const reader = new FileReader()
      reader.onloadend = () => {
        clearInterval(interval)
        setUploadingFile({ name: file.name, size: formattedSize, progress: 100 })

        setTimeout(() => {
          try {
            const rawResult = (reader.result as string) || ''
            const isLarge = file.size > 2 * 1024 * 1024
            const newItem: MediaItem = {
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              type: file.type || (isPdf ? 'application/pdf' : 'application/octet-stream'),
              size: formattedSize,
              url: isLarge ? '' : rawResult,
              date: new Date().toISOString().split('T')[0],
              category: isPdf ? 'PDF Documents' : isImg ? 'Images' : 'Documents'
            }

            saveMedia([newItem, ...mediaList])
            showNotify('Global asset uploaded successfully.')
          } catch (err) {
            console.error('Save media error', err)
          } finally {
            setIsUploading(false)
            setUploadingFile(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
          }
        }, 300)
      }
      reader.readAsDataURL(file)
    }, 800)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to permanently delete this asset?')) {
      const newList = mediaList.filter(m => m.id !== id)
      saveMedia(newList)
      setSelectedItem(null)
      showNotify('File deleted successfully.')
    }
  }

  const filteredMedia = mediaList.filter(m => {
    const isPdf = m.name.toLowerCase().endsWith('.pdf') || m.type === 'application/pdf'
    let matchesCat = false
    if (activeCategory === 'All') {
      matchesCat = true
    } else if (activeCategory === 'PDF Documents') {
      matchesCat = isPdf
    } else if (activeCategory === 'Documents') {
      matchesCat = !isPdf && (m.category === 'Documents' || !m.type?.startsWith('image/'))
    } else if (activeCategory === 'Images') {
      matchesCat = m.category === 'Images' || m.type?.startsWith('image/')
    } else {
      matchesCat = m.category === activeCategory
    }

    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesSearch
  })

  const CATEGORIES = ['All', 'PDF Documents', 'Documents', 'Images', 'Email Assets']

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 relative">
      
      {/* Uploading Progress Modal Overlay */}
      {uploadingFile && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-brand/20 max-w-sm w-full space-y-4 text-center">
            <div className="w-14 h-14 bg-indigo-50 text-brand rounded-full flex items-center justify-center mx-auto shadow-inner relative">
              <UploadCloud size={28} className="animate-bounce" />
              <div className="absolute inset-0 rounded-full border-2 border-brand border-t-transparent animate-spin" />
            </div>

            <div>
              <h3 className="font-bold text-slate-800 text-base">Uploading Global Asset...</h3>
              <p className="text-xs text-slate-500 font-medium truncate mt-1 px-4" title={uploadingFile.name}>
                {uploadingFile.name} ({uploadingFile.size})
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold text-brand px-1">
                <span>Progress</span>
                <span>{uploadingFile.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="bg-gradient-to-r from-brand via-indigo-600 to-purple-600 h-full rounded-full transition-all duration-200 ease-out shadow-sm"
                  style={{ width: `${uploadingFile.progress}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400">Please wait while your global asset is stored.</p>
          </div>
        </div>
      )}

      {/* Top Notification Bar */}
      {notification && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-2.5 rounded-b-xl shadow-lg text-sm font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top-4">
          <CheckCircle2 size={16} /> {notification}
        </div>
      )}

      {/* Sidebar Navigation */}
      <div className="w-64 shrink-0 flex flex-col gap-6">
        <div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full bg-brand hover:bg-brand-light text-white font-semibold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            ) : (
              <><UploadCloud size={18} /> Upload New Asset</>
            )}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip" />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-3 mt-2">Folders</h3>
          <div className="flex flex-col gap-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === cat ? 'bg-slate-100 text-brand' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Folder size={16} className={activeCategory === cat ? 'text-brand' : 'text-slate-400'} fill={activeCategory === cat ? 'currentColor' : 'none'} fillOpacity={0.2} />
                {cat}
              </button>
            ))}
          </div>

          <div className="mt-8 px-3">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <h4 className="text-xs font-bold text-blue-800 mb-1">Global Storage</h4>
              <p className="text-[10px] text-blue-600 leading-tight">These assets are available for global system usage (emails, banners).</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {activeCategory} Assets <span className="text-sm font-normal text-slate-400">({filteredMedia.length})</span>
          </h2>
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search files..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredMedia.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                <ImageIcon size={40} />
              </div>
              <h3 className="text-slate-700 font-semibold mb-1">No files found</h3>
              <p className="text-sm text-slate-500 max-w-sm">There are no files in this category. Upload an asset to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredMedia.map(item => {
                const isPdf = item.name.toLowerCase().endsWith('.pdf') || item.type === 'application/pdf'
                const isImg = (item.type.startsWith('image/') || item.url?.startsWith('data:image')) && item.url
                const isDoc = item.name.endsWith('.doc') || item.name.endsWith('.docx')
                const isExcel = item.name.endsWith('.xls') || item.name.endsWith('.xlsx') || item.name.endsWith('.csv')
                const ext = item.name.split('.').pop()?.toUpperCase() || 'FILE'

                return (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`group relative aspect-square rounded-xl border overflow-hidden cursor-pointer transition-all ${
                      selectedItem?.id === item.id ? 'border-brand ring-2 ring-brand/20 shadow-md' : 'border-slate-200 hover:border-brand/50 hover:shadow-sm'
                    }`}
                  >
                    {isImg ? (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center overflow-hidden">
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : isPdf ? (
                      <div className="w-full h-full bg-gradient-to-br from-red-50 to-red-100/50 flex flex-col items-center justify-center gap-2 p-3 text-red-600">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-red-200">
                          <FileText size={26} className="text-red-600" />
                        </div>
                        <span className="text-[11px] font-extrabold uppercase bg-red-600 text-white px-2 py-0.5 rounded shadow-sm tracking-wider">{ext}</span>
                      </div>
                    ) : isDoc ? (
                      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100/50 flex flex-col items-center justify-center gap-2 p-3 text-blue-600">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-blue-200">
                          <FileText size={26} className="text-blue-600" />
                        </div>
                        <span className="text-[11px] font-extrabold uppercase bg-blue-600 text-white px-2 py-0.5 rounded shadow-sm tracking-wider">{ext}</span>
                      </div>
                    ) : isExcel ? (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-emerald-100/50 flex flex-col items-center justify-center gap-2 p-3 text-emerald-600">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-emerald-200">
                          <FileText size={26} className="text-emerald-600" />
                        </div>
                        <span className="text-[11px] font-extrabold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded shadow-sm tracking-wider">{ext}</span>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center gap-2 p-3 text-slate-500">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-200">
                          <FileText size={26} className="text-slate-600" />
                        </div>
                        <span className="text-[11px] font-extrabold uppercase bg-slate-700 text-white px-2 py-0.5 rounded shadow-sm tracking-wider">{ext}</span>
                      </div>
                    )}
                    
                    {/* Item Overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-900/40 to-transparent p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                      <p className="text-white text-xs font-semibold truncate">{item.name}</p>
                      <p className="text-slate-300 text-[10px]">{item.size}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Asset Details Sidebar */}
      {selectedItem && (() => {
        const isPdf = selectedItem.name.toLowerCase().endsWith('.pdf') || selectedItem.type === 'application/pdf'
        const isImg = selectedItem.type.startsWith('image/') || selectedItem.url?.startsWith('data:image')
        const isDoc = selectedItem.name.endsWith('.doc') || selectedItem.name.endsWith('.docx') || selectedItem.name.endsWith('.txt')
        const isExcel = selectedItem.name.endsWith('.xls') || selectedItem.name.endsWith('.xlsx') || selectedItem.name.endsWith('.csv')

        const cleanDirectLink = selectedItem.url && selectedItem.url.startsWith('http')
          ? selectedItem.url
          : `${window.location.origin}/uploads/global-media/${selectedItem.name.toLowerCase().replace(/[^a-z0-9._-]/g, '_')}`

        return (
          <div className="w-80 shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-300">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Asset Details</h3>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Rich Preview Card based on File Type */}
              <div className="aspect-square bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center p-4 overflow-hidden relative group">
                {isImg && selectedItem.url ? (
                  <img src={selectedItem.url} alt={selectedItem.name} className="w-full h-full object-contain rounded" />
                ) : isPdf ? (
                  <div className="flex flex-col items-center justify-center text-center space-y-3 p-4 bg-red-50/50 rounded-lg w-full h-full border border-red-100">
                    <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-inner">
                      <FileText size={32} />
                    </div>
                    <div>
                      <span className="bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">PDF Document</span>
                      <p className="text-xs font-semibold text-slate-800 mt-1 truncate max-w-[180px]">{selectedItem.name}</p>
                    </div>
                    {selectedItem.url && (
                      <a
                        href={selectedItem.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink size={13} /> Open PDF
                      </a>
                    )}
                  </div>
                ) : isDoc ? (
                  <div className="flex flex-col items-center justify-center text-center space-y-2 p-4 bg-blue-50/50 rounded-lg w-full h-full border border-blue-100">
                    <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                      <FileText size={32} />
                    </div>
                    <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">Word Document</span>
                    <p className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">{selectedItem.name}</p>
                  </div>
                ) : isExcel ? (
                  <div className="flex flex-col items-center justify-center text-center space-y-2 p-4 bg-emerald-50/50 rounded-lg w-full h-full border border-emerald-100">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                      <FileText size={32} />
                    </div>
                    <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">Spreadsheet</span>
                    <p className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">{selectedItem.name}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center space-y-2 p-4 bg-slate-100 rounded-lg w-full h-full">
                    <div className="w-14 h-14 bg-slate-200 text-slate-600 rounded-2xl flex items-center justify-center">
                      <FileText size={32} />
                    </div>
                    <span className="bg-slate-700 text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">Binary File</span>
                    <p className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">{selectedItem.name}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">File Name</label>
                  <p className="text-xs font-semibold text-slate-800 break-all">{selectedItem.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Size</label>
                    <p className="text-xs font-medium text-slate-700">{selectedItem.size}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Uploaded</label>
                    <p className="text-xs font-medium text-slate-700">{selectedItem.date}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Category & Type</label>
                  <p className="text-xs font-mono text-brand font-semibold">{selectedItem.category} ({selectedItem.type})</p>
                </div>
                
                {/* Clean Direct Link Field */}
                <div className="pt-3 border-t border-slate-100">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Direct Asset Link</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={cleanDirectLink} 
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-700 font-mono focus:outline-none select-all"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(cleanDirectLink)
                        showNotify('Clean asset URL copied to clipboard!')
                      }}
                      className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-brand rounded-lg transition-colors border border-indigo-200 font-semibold text-xs flex items-center gap-1"
                      title="Copy Direct Link"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Clean shareable asset URL for global email templates and announcements.</p>
                </div>
              </div>
            </div>

            {/* Universal File Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
              <a 
                href={selectedItem.url || cleanDirectLink} 
                download={selectedItem.name}
                className="flex-1 bg-brand hover:bg-brand-light text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Download size={14} /> Download File
              </a>
              
              <button 
                onClick={() => handleDelete(selectedItem.id)}
                className="px-4 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                title="Delete Asset"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
