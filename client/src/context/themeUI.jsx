import React, { useState, useEffect, useCallback, useRef } from "react"
import Select from "react-select"
import ReactQuill from "react-quill-new"
import "react-quill-new/dist/quill.snow.css"
import { X, AlertCircle, Upload, File, FileText, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react"
import { useTheme } from "../context/themeContext"
export const ThemeUI = {


	/**
	 * MultiFileInput - A styled drag-and-drop file input for multiple file uploads
	 *
	 * @param {Object} props - Component props
	 * @param {string} props.id - Input element ID
	 * @param {string} props.name - Input name attribute
	 * @param {Function} props.onChange - Change handler function
	 * @param {string} props.accept - File types to accept
	 * @param {Array} props.files - Array of file objects
	 * @param {Function} props.onDeleteFile - Handler for deleting a file
	 * @param {string} props.error - Error message to display
	 * @param {number} props.maxFiles - Maximum number of files allowed
	 * @param {number} props.maxSize - Maximum file size in MB
	 * @param {string} props.placeholder - Placeholder text
	 */
	MultiFileInput: ({
		id,
		name,
		onChange,
		accept,
		files 		= [],
		onDeleteFile,
		error,
		maxFiles 	= 10,
		maxSize 	= 5,
		placeholder = "Drag files here or click to browse",
	}) => {
		const { theme } 				  = useTheme()
		const hasError 					  = !!error
		const fileInputRef 				  = React.useRef(null)
		const [dragActive, setDragActive] = React.useState(false)
		const [lightboxOpen, setLightboxOpen] = React.useState(false)
		const [lightboxIndex, setLightboxIndex] = React.useState(0)
		const multiFileInputStyleId 	  = `multi-file-input-style-${id || name}`

		// Handle drag events
		const handleDrag = (e) => {
			e.preventDefault()
			e.stopPropagation()
			if(e.type === "dragenter" || e.type === "dragover"){
				setDragActive(true)
			}else 
			if(e.type === "dragleave"){
				setDragActive(false)
			}
		}

		// Handle file drop
		const handleDrop = (e) => {
			e.preventDefault()
			e.stopPropagation()
			setDragActive(false)
			if(e.dataTransfer.files && e.dataTransfer.files.length > 0){
				const newFiles = Array.from(e.dataTransfer.files)
				.filter((file) => file instanceof File)
				.map((file) => ({
					name: file.name,
					size: file.size,
					type: file.type,
					preview: file.type.startsWith("image/")
					? URL.createObjectURL(file) : null,
					file,
				}))
				handleFiles(newFiles)
			}
		}

		// Handle click on the drop zone
		const handleClick = () => {
			fileInputRef.current?.click()
		}

		// Handle file input change
		const handleFileChange = (e) => {
			if(e.target.files && e.target.files.length > 0){
				const newFiles = Array.from(e.target.files)
				// .filter((file) => file instanceof File)
				.filter(file => file && typeof file === "object" && "name" in file && "size" in file)
				.map((file) => ({
					name: file.name,
					size: file.size,
					type: file.type,
					preview: file.type.startsWith("image/")
					? URL.createObjectURL(file) : null,
					file,
				}))
				handleFiles(newFiles)
			}
		}

		// Process files and validate them
		const handleFiles = (newFiles) => {
			if(files.length + newFiles.length > maxFiles){
				// Note: You'll need to import toast from react-toastify
				console.error(`You can upload a maximum of ${maxFiles} files.`)
				return
			}

			const validFiles = newFiles.filter((file) => {
				const fileSizeInMB = file.size / (1024 * 1024)
				if(file.size <= 0){
					console.error(`File "${file.name}" has an invalid size.`)
					return false
				}
				if(fileSizeInMB > maxSize){
					console.error(`File "${file.name}" exceeds the maximum size of ${maxSize}MB.`)
					return false
				}
				return true
			})
			if(validFiles.length > 0 && onChange){
				onChange({
					target: {
						name,
						files: validFiles.map((f) => f.file),
					},
				})
			}
		}

		// Handle file deletion
		const handleDeleteFile = (index) => {
			if(onDeleteFile && index >= 0 && index < files.length){
				const file = files[index]
				if(file.preview?.startsWith("blob:")){
					URL.revokeObjectURL(file.preview)
				}
				onDeleteFile(index)
			}
		}

		// Open lightbox
		const openLightbox = (index) => {
			setLightboxIndex(index)
			setLightboxOpen(true)
		}

		// Format file size for display
		const formatFileSize = (sizeInBytes) => {
			if(!sizeInBytes || sizeInBytes <= 0) return "Unknown"
			if(sizeInBytes < 1024) return `${sizeInBytes} B`
			if(sizeInBytes < 1024 * 1024)
			return `${(sizeInBytes / 1024).toFixed(1)} KB`
			return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
		}

		// Check if file is an image
		const isImage = (file) => {
			return file?.type?.startsWith("image/") || file?.mimetype?.startsWith("image/")
		}

		// Get appropriate icon for file type
		const getFileIcon = (file) => {
			const type = file?.type || file?.mimetype || ''
			if(type.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />
			if(type.includes('word') || type.includes('document')) return <FileText className="w-4 h-4 text-blue-500" />
			return <File className="w-4 h-4 text-gray-500" />
		}

		// Apply custom styles based on theme
		React.useEffect(() 	  => {
			const styleEl 	  = document.createElement("style")
			styleEl.id 		  = multiFileInputStyleId
			styleEl.innerHTML = `
				.multi-file-dropzone:hover{
					border-color: ${hasError ? "#ef4444" : theme.primaryGradientStart} !important;
				}
				.multi-file-dropzone:focus{
					border-color: ${hasError ? "#ef4444" : theme.primaryGradientStart} !important;
					box-shadow: 0 0 0 2px ${hasError ? "#ef444440" : `${theme.primaryGradientStart}40`} !important;
				}
				.file-preview-item:hover .file-delete-btn{
					opacity: 1;
				}
				.file-preview-item:hover{
					background-color: ${theme.primaryGradientStart}10;
				}
			`
			document.head.appendChild(styleEl)
			return () => {
				const existingStyle = document.getElementById(multiFileInputStyleId)
				if (existingStyle) existingStyle.remove()
			}
		}, [theme.primaryGradientStart, id, name, hasError])

		// Cleanup blob URLs on unmount
		React.useEffect(() => {
			return () => {
				files.forEach((file) => {
					if(file.preview?.startsWith("blob:")){
						URL.revokeObjectURL(file.preview)
					}
				})
			}
		}, [files])

		// Lightbox Component
		const AttachmentLightbox = () => {
			const [currentIndex, setCurrentIndex] = React.useState(lightboxIndex)
			const [zoom, setZoom] = React.useState(1)
			const [isDragging, setIsDragging] = React.useState(false)
			const [position, setPosition] = React.useState({ x: 0, y: 0 })
			const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 })

			React.useEffect(() => {
				setCurrentIndex(lightboxIndex)
				setZoom(1)
				setPosition({ x: 0, y: 0 })
			}, [lightboxIndex, lightboxOpen])

			if (!lightboxOpen || files.length === 0) return null

			const currentFile = files[currentIndex]
			const currentIsImage = isImage(currentFile)

			const goToPrevious = () => {
				setCurrentIndex((prev) => (prev > 0 ? prev - 1 : files.length - 1))
				setZoom(1)
				setPosition({ x: 0, y: 0 })
			}

			const goToNext = () => {
				setCurrentIndex((prev) => (prev < files.length - 1 ? prev + 1 : 0))
				setZoom(1)
				setPosition({ x: 0, y: 0 })
			}

			const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3))
			const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5))
			const resetZoom = () => {
				setZoom(1)
				setPosition({ x: 0, y: 0 })
			}

			const handleMouseDown = (e) => {
				if (zoom > 1 && currentIsImage) {
					setIsDragging(true)
					setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
				}
			}

			const handleMouseMove = (e) => {
				if (isDragging && zoom > 1) {
					setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
				}
			}

			const handleMouseUp = () => setIsDragging(false)

			const handleDownload = async () => {
				try {
					const url = currentFile.url || currentFile.preview
					const fileName = currentFile.name || currentFile.originalName || 'download'
					
					const response = await fetch(url)
					const blob = await response.blob()
					const blobUrl = window.URL.createObjectURL(blob)
					
					const link = document.createElement('a')
					link.href = blobUrl
					link.download = fileName
					document.body.appendChild(link)
					link.click()
					document.body.removeChild(link)
					window.URL.revokeObjectURL(blobUrl)
				} catch (error) {
					console.error('Download failed:', error)
					window.open(currentFile.url || currentFile.preview, '_blank')
				}
			}

			React.useEffect(() => {
				const handleKeyDown = (e) => {
					if (!lightboxOpen) return
					if (e.key === 'Escape') setLightboxOpen(false)
					if (e.key === 'ArrowLeft') goToPrevious()
					if (e.key === 'ArrowRight') goToNext()
					if (e.key === '+' || e.key === '=') handleZoomIn()
					if (e.key === '-') handleZoomOut()
				}
				window.addEventListener('keydown', handleKeyDown)
				return () => window.removeEventListener('keydown', handleKeyDown)
			}, [lightboxOpen, currentIndex, zoom])

			const getLightboxFileIcon = () => {
				const type = currentFile.type || currentFile.mimetype || ''
				if (type.includes('pdf')) return <FileText className="w-16 h-16 text-red-500" />
				if (type.includes('word') || type.includes('document')) return <FileText className="w-16 h-16 text-blue-500" />
				return <File className="w-16 h-16 text-gray-500" />
			}

			return (
				<div className="fixed inset-0 z-[9999] bg-black bg-opacity-95 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
					{/* Header */}
					<div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent p-4 z-10">
						<div className="flex items-center justify-between text-white">
							<div className="flex-1">
								<p className="text-lg font-semibold truncate">
									{currentFile.name || currentFile.originalName || 'Attachment'}
								</p>
								<p className="text-sm text-gray-300">
									{currentIndex + 1} of {files.length} • {formatFileSize(currentFile.size)}
								</p>
							</div>
							<button onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }} className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors" title="Close (Esc)">
								<X className="w-6 h-6" />
							</button>
						</div>
					</div>

					{/* Content */}
					<div className="relative w-full h-full flex items-center justify-center p-16" onClick={(e) => e.stopPropagation()} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
						{currentIsImage ? (
							<div className={`relative ${isDragging ? 'cursor-grabbing' : zoom > 1 ? 'cursor-grab' : 'cursor-default'}`}
								style={{ transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' }}
								onMouseDown={handleMouseDown}>
								<img src={currentFile.url || currentFile.preview} alt={currentFile.name} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" draggable={false} />
							</div>
						) : (
							<div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl">
								<div className="flex flex-col items-center text-center space-y-4">
									{getLightboxFileIcon()}
									<div>
										<p className="text-lg font-semibold text-gray-900 break-all">{currentFile.name || currentFile.originalName}</p>
										<p className="text-sm text-gray-500 mt-1">{formatFileSize(currentFile.size)}</p>
									</div>
									<button onClick={handleDownload} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
										<Download className="w-5 h-5" /> Download File
									</button>
								</div>
							</div>
						)}
					</div>

					{/* Controls for images */}
					{currentIsImage && (
						<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
							<div className="flex items-center justify-center gap-4">
								<div className="flex items-center gap-2 bg-black bg-opacity-50 rounded-lg p-2">
									<button onClick={(e) => { e.stopPropagation(); handleZoomOut(); }} className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded transition-colors" disabled={zoom <= 0.5}>
										<ZoomOut className="w-5 h-5" />
									</button>
									<span className="text-white font-medium min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
									<button onClick={(e) => { e.stopPropagation(); handleZoomIn(); }} className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded transition-colors" disabled={zoom >= 3}>
										<ZoomIn className="w-5 h-5" />
									</button>
								</div>
								<button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className="p-2 bg-black bg-opacity-50 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors" title="Download">
									<Download className="w-5 h-5" />
								</button>
								{zoom !== 1 && (
									<button onClick={(e) => { e.stopPropagation(); resetZoom(); }} className="px-4 py-2 bg-black bg-opacity-50 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-sm font-medium">
										Reset
									</button>
								)}
							</div>
						</div>
					)}

					{/* Navigation arrows */}
					{files.length > 1 && (
						<>
							<button onClick={(e) => { e.stopPropagation(); goToPrevious(); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white hover:bg-opacity-70 rounded-full transition-colors" title="Previous (←)">
								<ChevronLeft className="w-8 h-8" />
							</button>
							<button onClick={(e) => { e.stopPropagation(); goToNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white hover:bg-opacity-70 rounded-full transition-colors" title="Next (→)">
								<ChevronRight className="w-8 h-8" />
							</button>
						</>
					)}

					{/* Thumbnail strip */}
					{files.length > 1 && (
						<div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 bg-black bg-opacity-50 p-2 rounded-lg max-w-[90vw] overflow-x-auto">
							{files.map((file, index) => {
								const thumbIsImage = isImage(file)
								return (
									<button key={index} onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); resetZoom(); }} 
										className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${index === currentIndex ? 'border-blue-500 scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}>
										{thumbIsImage ? (
											<img src={file.url || file.preview} alt={file.name} className="w-full h-full object-cover" />
										) : (
											<div className="w-full h-full bg-gray-700 flex items-center justify-center">
												<File className="w-6 h-6 text-white" />
											</div>
										)}
									</button>
								)
							})}
						</div>
					)}
				</div>
			)
		}
		let dynamicWidth;
		let dynamicGrid;
		if(id == 'training_files'){
			dynamicWidth = 'w-1/6';
			dynamicGrid  = 'grid grid-cols-1 sm:grid-cols-5  gap-2 max-h-60 overflow-y-auto p-1';
		}else{
			dynamicWidth = 'w-full';
			dynamicGrid  = 'grid grid-cols-1 sm:grid-cols-2  gap-2 max-h-60 overflow-y-auto p-1';
		}
		return(
			<div className="w-full">
				<div
					className={`multi-file-dropzone ${dynamicWidth} border-2 border-dashed rounded-lg transition-all duration-200 outline-none focus:outline-none ${
						hasError ? "border-red-500" : dragActive ? "border-blue-500" : "border-gray-300"
					}`}
					onDragEnter	= {handleDrag}
					onDragLeave	= {handleDrag}
					onDragOver	= {handleDrag}
					onDrop		= {handleDrop}
					onClick		= {handleClick}
					tabIndex	= "0"
					role		= "button"
					aria-label	= "File upload area"
				>
					<input
						ref				 = {fileInputRef}
						type			 = "file"
						id				 = {id || name}
						name			 = {name}
						onChange		 = {handleFileChange}
						accept			 = {accept}
						multiple
						className		 = "hidden"
						aria-invalid	 = {hasError}
						aria-describedby = {hasError ? `${name}-error` : undefined}
					/>
					<div className="flex flex-col items-center justify-center py-3 px-2 md:py-4 md:px-4">
						<Upload
							className={`w-8 h-8 mb-2 md:w-10 md:h-10 ${
								hasError ? "text-red-500" : "text-gray-400"
							}`}
							style={{ color: dragActive ? theme.primaryGradientStart : "" }}
						/>
						<p className="text-xs md:text-sm text-gray-600 text-center">
							{placeholder}
						</p>
						<p className="text-xs text-gray-500 mt-1">
							Max {maxFiles} files, up to {maxSize}MB each
						</p>
					</div>
				</div>
				{hasError && (
					<div
						className="flex items-center mt-1 text-red-500 text-xs"
						id={`${name}-error`}
					>
						<AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
						<span>{error}</span>
					</div>
				)}
				{files.length > 0 && (
					<div className="file-previews mt-3">
						<div className="flex justify-between items-center mb-2">
							<p className="text-xs md:text-sm font-medium text-gray-700">
								Files ({files.length})
							</p>
							<p className="text-xs text-gray-500">
								{files.length} of {maxFiles} files
							</p>
						</div>
						<div className={`${dynamicGrid}`}>
							{files.map((file, index) => (
								<div
									key={`${file.name}-${index}`}
									className="file-preview-item flex items-center justify-between p-2 rounded-md border border-gray-200 bg-white transition-colors duration-200"
								>
								<div className="flex items-center space-x-2 min-w-0 flex-grow">
									<div 
										className="flex-shrink-0 w-8 h-8 rounded bg-gray-100 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
										onClick={(e) => {
											e.stopPropagation()
											openLightbox(index)
										}}
										title="Click to preview"
									>
										{isImage(file) && (file.preview || file.url) ? (
											<img
											src={file.preview || file.url}
											alt={file.name}
											className="h-full w-full object-cover rounded"
											onError={(e) => {
												e.target.style.display = "none"
												e.target.nextSibling.style.display = "flex"
											}}
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center">
											{getFileIcon(file)}
											</div>
										)}
									</div>
									<div 
										className="min-w-0 flex-grow cursor-pointer"
										onClick={(e) => {
											e.stopPropagation()
											openLightbox(index)
										}}
									>
										<p className="text-xs md:text-sm font-medium text-gray-800 truncate hover:text-blue-600 transition-colors">
											{file.name}
										</p>
										<p className="text-xs text-gray-500">
											{formatFileSize(file.size)}
										</p>
									</div>
								</div>
									<button
										type="button"
										onClick={(e) => {
										e.stopPropagation()
											handleDeleteFile(index)
										}}
										className="file-delete-btn p-1 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all duration-200 opacity-0 md:opacity-100"
										aria-label={`Delete ${file.name}`}
									>
										<X className="w-4 h-4" />
									</button>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Render Lightbox */}
				<AttachmentLightbox />
			</div>
		)
	},

	/**
	 * Input - A styled text input field
	 *
	 * @param {Object} props - Component props
	 * @param {string} props.id - Input element ID
	 * @param {string} props.name - Input name attribute
	 * @param {string} props.value - Input value
	 * @param {Function} props.onChange - Change handler function
	 * @param {string} props.placeholder - Placeholder text
	 * @param {boolean} props.required - Whether the field is required
	 * @param {string} props.type - Input type (text, email, password, etc.)
	 * @param {React.ReactNode} props.leftElement - Element to display at the left side
	 * @param {React.ReactNode} props.rightElement - Element to display at the right side
	 * @param {string} props.className - Additional CSS classes
	 * @param {string} props.error - Error message to display
	 */
	Input: ({
		id,
		name,
		value,
		onChange,
		placeholder,
		required = false,
		type = "text",
		leftElement,
		rightElement,
		className = "",
		error,
		...props
	}) => {
		const { theme }    = useTheme()
		const hasError 	   = !!error
		const inputStyleId = `input-style-${id || name}`
		// Dynamic input classes based on props and error state
		const inputClass   = `block w-full h-10 px-3 py-2 text-sm rounded-md bg-gray-50 
				border ${hasError ? "border-red-500" : "border-gray-200"} 
				text-gray-900 outline-none transition duration-200 ${className} 
				${leftElement ? "pl-10" : ""} ${rightElement ? "pr-10" : ""}`
		// Create dynamic styles for focus and hover states
		React.useEffect(() => {
		const styleEl 	   = document.createElement("style")
		styleEl.id 		   = inputStyleId
		styleEl.innerHTML  = `
			#${id || name}:focus{
				border-color: ${ hasError ? "#ef4444" : theme.primaryGradientStart } !important;
				box-shadow: 0 0 0 2px ${ hasError ? "#ef444440" : `${theme.primaryGradientStart}40` } !important;
			}
			#${id || name}:hover{
				border-color: ${ hasError ? "#ef4444" : theme.primaryGradientStart } !important;
			}
		`
		document.head.appendChild(styleEl)
		// Cleanup function to remove styles on unmount
		return() => {
			const existingStyle = document.getElementById(inputStyleId)
			if(existingStyle){
				existingStyle.remove()
			}
		}
		},[theme.primaryGradientStart, id, name, hasError])
		return(
			<div className="relative">
				{leftElement && (
					<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
						{leftElement}
					</div>
				)}
				<input
					type			 = {type}
					id				 = {id || name}
					name			 = {name}
					value            = {value || ""}
					onChange		 = {onChange}
					className		 = {inputClass}
					placeholder		 = {placeholder}
					aria-invalid	 = {hasError}
					aria-describedby = {hasError ? `${name}-error` : undefined}
					{...props}
				/>
				{rightElement && (
					<div className="absolute inset-y-0 right-0 flex items-center pr-3">
						{rightElement}
					</div>
				)}
				{hasError && (
					<div className="flex items-center mt-1 text-red-500 text-xs" id={`${name}-error`}>
						<AlertCircle className="w-3 h-3 mr-1" />
						<span>{error}</span>
					</div>
				)}
			</div>
		)
	},

	/**
	 * Textarea - A styled multi-line text input
	 *
	 * @param {Object} props - Component props
	 * @param {string} props.id - Textarea element ID
	 * @param {string} props.name - Textarea name attribute
	 * @param {string} props.value - Textarea value
	 * @param {Function} props.onChange - Change handler function
	 * @param {string} props.placeholder - Placeholder text
	 * @param {boolean} props.required - Whether the field is required
	 * @param {number} props.rows - Number of visible text rows
	 * @param {string} props.className - Additional CSS classes
	 * @param {string} props.error - Error message to display
	 */
	Textarea: ({
		id,
		name,
		value,
		onChange,
		placeholder,
		required = false,
		rows = 4,
		className = "",
		error,
		...props
	}) => {
		const { theme }       = useTheme()
		const hasError        = !!error
		const textareaStyleId = `textarea-style-${id || name}`
		const textareaClass   = `block w-full px-3 py-2 text-sm rounded-md bg-gray-50 
			border ${hasError ? "border-red-500" : "border-gray-200"} 
			text-gray-900 outline-none transition duration-200 ${className}`
		React.useEffect(() => {
		const styleEl         = document.createElement("style")
		styleEl.id            = textareaStyleId
		styleEl.innerHTML     = `
			#${id || name}:focus{
				border-color: ${ hasError ? "#ef4444" : theme.primaryGradientStart } !important;
				box-shadow: 0 0 0 2px ${ hasError ? "#ef444440" : `${theme.primaryGradientStart}40` } !important;
			}
			#${id || name}:hover{
				border-color: ${ hasError ? "#ef4444" : theme.primaryGradientStart } !important;
			}
		`
		document.head.appendChild(styleEl)
		return() => {
			const existingStyle = document.getElementById(textareaStyleId)
			if(existingStyle){
				existingStyle.remove()
			}
		}
		}, [theme.primaryGradientStart, id, name, hasError])
		return(
			<div className="relative">
				<textarea
					id				 = {id || name}
					name			 = {name}
					value			 = {value || ""}
					onChange		 = {onChange}
					className		 = {textareaClass}
					placeholder		 = {placeholder}
					rows			 = {rows}
					aria-invalid 	 = {hasError}
					aria-describedby = {hasError ? `${name}-error` : undefined}
					{...props}
				/>
				{hasError && (
					<div
						className="flex items-center mt-1 text-red-500 text-xs"
						id={`${name}-error`}
					>
						<AlertCircle className="w-3 h-3 mr-1" />
						<span>{error}</span>
					</div>
				)}
			</div>
		)
	},

	/**
	 * Select - A styled dropdown select component with single and multi-select support
	 *
	 * @param {Object} props - Component props
	 * @param {string} props.id - Select element ID
	 * @param {string} props.name - Select name attribute
	 * @param {any|Array} props.value - Selected value(s) (single value or array for multi-select)
	 * @param {Array} props.options - Array of options objects with value and label properties
	 * @param {Function} props.onChange - Change handler function
	 * @param {string} props.placeholder - Placeholder text
	 * @param {boolean} props.isSearchable - Whether the dropdown is searchable
	 * @param {boolean} props.isMulti - Whether to allow multiple selections
	 * @param {string} props.error - Error message to display
	 */
	Select: ({
		id,
		name,
		value,
		options,
		onChange,
		placeholder,
		isSearchable = true,
		isMulti = false,
		error,
		menuPortalTarget,
		menuPosition,
	}) => {
		const { theme } 		 = useTheme()
		const hasError 			 = !!error
		const customSelectStyles = {
			control: (base, state) => ({
				...base,
				borderColor: hasError ? "#ef4444" : state.isFocused ? theme.primaryGradientStart : "#e5e7eb",
				boxShadow: state.isFocused ? hasError ? "0 0 0 2px #ef444440" : `0 0 0 2px ${theme.primaryGradientStart}40` : "none",
				borderRadius: "0.375rem",
				minHeight: "40px",
				backgroundColor: "#f9fafb",
				"&:hover": { borderColor: hasError ? "#ef4444" : theme.primaryGradientStart},
			}),
			option: (base, state) => ({
				...base,
				backgroundColor : state.isSelected? theme.primaryGradientStart : state.isFocused ? `${theme.primaryGradientStart}20` : "transparent",
				color: state.isSelected ? "white" : "inherit",
				"&:active": { backgroundColor: `${theme.primaryGradientStart}30`},
			}),
			menu: (base) => ({
				...base,
				zIndex: 9999,
			}),
			menuPortal: (base) => ({
				...base,
				zIndex: 9999,
			}),
			multiValue: (base) => ({
				...base,
				backgroundColor: `${theme.primaryGradientStart}20`,
				borderRadius: "0.25rem",
			}),
			multiValueLabel: (base) => ({
				...base,
				color: theme.primaryGradientStart,
			}),
			multiValueRemove: (base) => ({
				...base,
				color: theme.primaryGradientStart,
				":hover": {
					backgroundColor: theme.primaryGradientStart,
					color: "white",
				},
			}),
		}
		// Handle value for both single and multi-select
		const selectedOption = isMulti ? options.filter((option) => value?.includes(option.value)) : options.find((option) => option.value === value) || null
		return(
			<div>
				<Select
					id				 = {id}
					name			 = {name}
					value			 = {selectedOption}
					onChange		 = {(selectedOption, actionMeta) => {
						if(onChange){
							if(isMulti){
								// For multi-select, pass array of selected values or null if empty
								const selectedValues = selectedOption ? selectedOption.map((opt) => opt.value) : []
								onChange(selectedValues, actionMeta)
							}else{
								// For single select, pass the selected option or null
								onChange(selectedOption, actionMeta)
							}
						}
					}}
					options			 = {options}
					styles			 = {customSelectStyles}
					isSearchable	 = {isSearchable}
					isMulti			 = {isMulti}
					placeholder		 = {placeholder}
					className		 = "react-select-container"
					classNamePrefix	 = "react-select"
					aria-invalid	 = {hasError}
					aria-describedby = {hasError ? `${name}-error` : undefined}
					menuPortalTarget = {menuPortalTarget}
					menuPosition	 = {menuPosition || (menuPortalTarget ? "fixed" : "absolute")}
				/>
				{hasError && (
					<div
						className="flex items-center mt-1 text-red-500 text-xs"
						id={`${name}-error`}
					>
						<AlertCircle className="w-3 h-3 mr-1" />
						<span>{error}</span>
					</div>
				)}
			</div>
		)
	},

	/**
	 * AutoComplete - A custom autocomplete component with async data loading
	 */
	AutoComplete : ({
		id,
		name,
		value          = [],
		loadOptions,
		onChange,
		placeholder    = "Type to search...",
		isMulti        = true,
		isDisabled     = false,
		cacheOptions   = true,
		noOptionsMessage,
		error,
		minInputLength = 1,
		debounceDelay  = 300,
	}) => {
		const { theme } 							  = useTheme();
		const hasError 								  = !!error;
		const [inputValue, setInputValue]   		  = useState("");
		const [options, setOptions] 				  = useState([]);
		const [isLoading, setIsLoading] 			  = useState(false);
		const [isMenuOpen, setIsMenuOpen] 			  = useState(false);
		const [cache, setCache] 					  = useState({});
		const [highlightedIndex, setHighlightedIndex] = useState(-1);
		const containerRef 							  = useRef(null);
		const inputRef 								  = useRef(null);
		const menuRef 								  = useRef(null);
		const debounceRef 							  = useRef(null);
		const autocompleteStyleId 					  = `autocomplete-style-${id || name}`;
		
		// Dynamic styling to match other ThemeUI components
		React.useEffect(() => {
			const styleEl 	  = document.createElement("style");
			styleEl.id 		  = autocompleteStyleId;
			styleEl.innerHTML = `
				#${id || name}:focus {
					border-color: ${hasError ? "#ef4444" : theme.primaryGradientStart} !important;
					box-shadow: 0 0 0 2px ${hasError ? "#ef444440" : `${theme.primaryGradientStart}40`} !important;
				}
				#${id || name}:hover:not(:disabled) {
					border-color: ${hasError ? "#ef4444" : theme.primaryGradientStart} !important;
				}
				.autocomplete-option-${id || name}:hover {
					background-color: ${theme.primaryGradientStart}20 !important;
				}
				.autocomplete-option-highlighted-${id || name} {
					background-color: ${theme.primaryGradientStart}20 !important;
				}
				.autocomplete-tag-${id || name} {
					background-color: ${theme.primaryGradientStart}20 !important;
					color: ${theme.primaryGradientStart} !important;
				}
				.autocomplete-loading-${id || name} {
					border-top-color: ${theme.primaryGradientStart} !important;
				}
			`;
			document.head.appendChild(styleEl);
			return() => {
				const existingStyle = document.getElementById(autocompleteStyleId);
				if(existingStyle){
					existingStyle.remove();
				}
			};
		}, [theme.primaryGradientStart, id, name, hasError]);

		// Debounced search function
		const debouncedSearch = useCallback(
			(searchValue) => {
				if(debounceRef.current){
					clearTimeout(debounceRef.current);
				}
				debounceRef.current = setTimeout(() => {
					if(!searchValue || searchValue.length < minInputLength){
						setOptions([]);
						setIsLoading(false);
						return;
					}
					// Check cache first
					if(cacheOptions && cache[searchValue]){
						setOptions(cache[searchValue]);
						setIsLoading(false);
						return;
					}
					setIsLoading(true);
					loadOptions(searchValue, (loadedOptions) => {
						setOptions(loadedOptions || []);
						if(cacheOptions){
							setCache((prev) => ({
								...prev,
								[searchValue]: loadedOptions || [],
							}));
						}
						setIsLoading(false);
					});
				}, debounceDelay);
			},
			[loadOptions, minInputLength, debounceDelay, cacheOptions, cache]
		);

		// Handle input change
		const handleInputChange = (e) => {
			const newValue 		= e.target.value;
			setInputValue(newValue);
			setHighlightedIndex(-1);
			if(newValue.trim()){
				setIsMenuOpen(true);
				debouncedSearch(newValue);
			}else{
				setIsMenuOpen(false);
				setOptions([]);
			}
		};

		// Handle option selection
		const handleOptionSelect = (option) => {
			if(isMulti){
				const isAlreadySelected = value.some((item) => item.value === option.value);
				if(!isAlreadySelected){
					const newValue = [...value, option];
					onChange && onChange(newValue);
				}
				setInputValue("");
			}else{
				onChange && onChange([option]);
				setInputValue(option.label);
			}
			setIsMenuOpen(false);
			setOptions([]);
			setHighlightedIndex(-1);
		};

		// Handle item removal (for multi-select)
		const handleRemoveItem = (optionToRemove) => {
			const newValue = value.filter((item) => item.value !== optionToRemove.value);
			onChange && onChange(newValue);
		};

		// Handle keyboard navigation
		const handleKeyDown = (e) => {
			if(!isMenuOpen || options.length === 0){
				if(e.key === "Enter"){
					e.preventDefault();
				}
				return;
			}
			switch(e.key){
				case "ArrowDown":
					e.preventDefault();
					setHighlightedIndex((prev) => prev < options.length - 1 ? prev + 1 : prev);
					break;
				case "ArrowUp":
					e.preventDefault();
					setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
					break;
				case "Enter":
					e.preventDefault();
					if(highlightedIndex >= 0 && highlightedIndex < options.length){
						handleOptionSelect(options[highlightedIndex]);
					}
					break;
				case "Escape":
					setIsMenuOpen(false);
					setHighlightedIndex(-1);
					break;
			}
		};

		// Close menu when clicking outside
		useEffect(() => {
			const handleClickOutside = (event) => {
				if(containerRef.current && !containerRef.current.contains(event.target)){
					setIsMenuOpen(false);
					setHighlightedIndex(-1);
				}
			};
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}, []);

		// Scroll highlighted option into view
		useEffect(() => {
			if(highlightedIndex >= 0 && menuRef.current){
				const highlightedElement = menuRef.current.children[highlightedIndex];
				if(highlightedElement){
					highlightedElement.scrollIntoView({
						block: "nearest",
					});
				}
			}
		}, [highlightedIndex]);

		// Sync input value for single-select mode only when not focused
		useEffect(() => {
			if(!isMulti && !isMenuOpen){
				if(value && value.length > 0){
					setInputValue(value[0].label);
				}else 
				if(!value || value.length === 0) {
					setInputValue("");
				}
			}
		}, [value, isMulti, isMenuOpen]);

		// Input classes to match other components
		const inputClass = `block w-full h-10 px-3 py-2 text-sm rounded-md bg-gray-50 
			border ${hasError ? "border-red-500" : "border-gray-200"} 
			text-gray-900 outline-none transition duration-200 
			${isDisabled ? "opacity-60 cursor-not-allowed bg-gray-100" : ""}`;
			
		return(
			<div className="relative" ref={containerRef}>
				{/* Selected items display (for multi-select) */}
				{isMulti && value.length > 0 && (
					<div className="flex flex-wrap gap-2 mb-2">
						{value.map((item) => (
							<div
								key={item.value}
								className={`inline-flex items-center px-2 py-1 rounded text-sm autocomplete-tag-${
									id || name
								}`}
							>
								<span>{item.label}</span>
								<button
									type="button"
									onClick={() => handleRemoveItem(item)}
									className="ml-1 hover:bg-white hover:bg-opacity-30 rounded p-0.5"
									disabled={isDisabled}
								>
									<X className="w-3 h-3" />
								</button>
							</div>
						))}
					</div>
				)}
				{/* Input field */}
				<div className="relative">
					<input
						ref				 = {inputRef}
						type			 = "text"
						id				 = {id || name}
						name			 = {name}
						value			 = {inputValue}
						onChange		 = {handleInputChange}
						onKeyDown		 = {handleKeyDown}
						onFocus			 = {() => {
							if(inputValue.trim()){
								setIsMenuOpen(true);
							}
						}}
						placeholder 	 = {placeholder}
						disabled		 = {isDisabled}
						className		 = {inputClass}
						aria-invalid	 = {hasError}
						aria-describedby = {hasError ? `${name}-error` : undefined}
					/>
					{/* Clear button for single-select */}
					{!isMulti && value && value.length > 0 && !isDisabled && !isLoading && (
						<button
							type		 = "button"
							onClick      = {() => {
							onChange && onChange([]);
								setInputValue("");
							}}
							className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
						>
							<X className="w-4 h-4" />
						</button>
					)}
					{/* Loading indicator */}
					{isLoading && (
						<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
							<div
								className={`animate-spin rounded-full h-4 w-4 border-2 border-gray-300 autocomplete-loading-${
									id || name
								}`}
							/>
						</div>
					)}
				</div>
				{/* Dropdown menu */}
				{isMenuOpen && (
					<div ref={menuRef}
					className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
					>
						{isLoading ? (
							<div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
						) : options.length > 0 ? (
							options.map((option, index) => (
								<button
									key={option.value}
									type="button"
									className={`w-full text-left px-3 py-2 text-sm transition-colors duration-200 focus:outline-none 
									autocomplete-option-${id || name} 
									${highlightedIndex === index ? `autocomplete-option-highlighted-${id || name}` : "" }`}
									onClick={() => handleOptionSelect(option)}
									onMouseEnter={() => setHighlightedIndex(index)}
								>
									{option.label}
								</button>
							))
						) : inputValue.length >= minInputLength ? (
							<div className="px-3 py-2 text-sm text-gray-500">
							{noOptionsMessage ? noOptionsMessage({ inputValue }) : "No options found"}
							</div>
						) : (
							<div className="px-3 py-2 text-sm text-gray-500">
								Type {minInputLength} or more characters to search
							</div>
						)}
					</div>
				)}
				{/* Error message */}
				{hasError && (
					<div
						className="flex items-center mt-1 text-red-500 text-xs"
						id={`${name}-error`}
					>
						<AlertCircle className="w-3 h-3 mr-1" />
						<span>{error}</span>
					</div>
				)}
			</div>
		);
	},

	/**
	 * Checkbox - A styled checkbox input
	 *
	 * @param {Object} props - Component props
	 * @param {string} props.id - Checkbox element ID
	 * @param {string} props.name - Checkbox name attribute
	 * @param {boolean} props.checked - Whether the checkbox is checked
	 * @param {Function} props.onChange - Change handler function
	 * @param {string} props.error - Error message to display
	 */
	Checkbox: ({ id, name, checked, onChange, error, ...props }) => {
		const { theme } 	  = useTheme()
		const hasError 		  = !!error
		const checkboxStyleId = `checkbox-style-${id || name}`
		React.useEffect(() => {
			const styleEl 	  = document.createElement("style")
			styleEl.id 		  = checkboxStyleId
			styleEl.innerHTML = `
				#${id || name}:focus{
					outline: none;
					box-shadow: 0 0 0 2px ${ hasError ? "#ef444440" : `${theme.primaryGradientStart}40`} !important;
				}
				#${id || name}:hover:not(:disabled){
					border-color: ${ hasError ? "#ef4444" : theme.primaryGradientStart } !important;
				}
				#${id || name}:checked{
					background-color: ${theme.primaryGradientStart} !important;
					border-color: ${theme.primaryGradientStart} !important;
				}
			`
			document.head.appendChild(styleEl)
			return () => {
				const existingStyle = document.getElementById(checkboxStyleId)
				if(existingStyle){
					existingStyle.remove()
				}
			}
		}, [theme.primaryGradientStart, id, name, hasError])
		return(
			<div>
				<input
					type      		 = "checkbox"
					id        		 = {id || name}
					name      		 = {name}
					checked   		 = {checked}
					onChange  		 = {onChange}
					className 		 = {`h-4 w-4 rounded ${
						hasError ? "border-red-500" : "border-gray-300"
					} cursor-pointer transition duration-200`}
					style			 = {{
						accentColor: theme.primaryGradientStart,
					}}
					aria-invalid     = {hasError}
					aria-describedby = {hasError ? `${name}-error` : undefined}
					{...props}
				/>
				{/* Only show error if it exists (FormField will handle group errors) */}
				{hasError && (
					<div
						className="flex items-center mt-1 text-red-500 text-xs"
						id={`${name}-error`}
					>
						<AlertCircle className="w-3 h-3 mr-1" />
						<span>{error}</span>
					</div>
				)}
			</div>
		)
	},

	/**
	 * ColorInput - A styled color picker input
	 *
	 * @param {Object} props - Component props
	 * @param {string} props.name - Input name attribute
	 * @param {string} props.value - Color value (hex format)
	 * @param {Function} props.onChange - Change handler function
	 * @param {Function} props.onColorPickerChange - Optional separate handler for the color picker
	 * @param {string} props.error - Error message to display
	 */
	ColorInput: ({ name, value, onChange, onColorPickerChange, error }) => {
		const { theme } 		= useTheme()
		const hasError 			= !!error
		const textInputId 		= `color-text-${name}`
		React.useEffect(() => {
			const styleEl 		= document.createElement("style")
			styleEl.id 			= `color-input-style-${name}`
			styleEl.innerHTML 	= `
				#${textInputId}:focus{
					border-color: ${hasError ? "#ef4444" : theme.primaryGradientStart} !important;
					box-shadow: 0 0 0 2px ${hasError ? "#ef444440" : `${theme.primaryGradientStart}40`} !important;
				}
				#${textInputId}:hover{
					border-color: ${hasError ? "#ef4444" : theme.primaryGradientStart} !important;
				}
			`
			document.head.appendChild(styleEl)
			return() => {
				const existingStyle = document.getElementById(`color-input-style-${name}`)
				if(existingStyle){
					existingStyle.remove()
				}
			}
		}, [theme.primaryGradientStart, name, hasError])
		return(
			<div>
				<div className="flex items-center space-x-2">
					<div className="color-input-container">
						<div className="color-picker">
							<input
								type	 = "color"
								id		 = {`${name}Picker`}
								value	 = {value}
								onChange = {
									onColorPickerChange || ((e) => {
										const syntheticEvent = {
											target: { name, value: e.target.value },
										}
										onChange(syntheticEvent)
									})
								}
							/>
						</div>
						<input
							type		 = "text"
							id			 = {textInputId}
							name		 = {name}
							value 		 = {value}
							onChange	 = {onChange}
							className	 = {`color-text-input ${hasError ? "border-red-500" : "border-gray-200"}`}
							aria-invalid     = {hasError}
							aria-describedby = {hasError ? `${name}-error` : undefined}
						/>
					</div>
				</div>
				{hasError && (
					<div
						className="flex items-center mt-1 text-red-500 text-xs"
						id={`${name}-error`}
					>
						<AlertCircle className="w-3 h-3 mr-1" />
						<span>{error}</span>
					</div>
				)}
			</div>
		)
	},

	/**
	 * FileInput - A styled file input for single file uploads
	 *
	 * @param {Object} props - Component props
	 * @param {string} props.id - Input element ID
	 * @param {string} props.name - Input name attribute
	 * @param {Function} props.onChange - Change handler function
	 * @param {string} props.accept - File types to accept
	 * @param {string} props.preview - URL for file preview
	 * @param {Function} props.onDelete - Handler for deleting the file
	 * @param {string} props.error - Error message to display
	 * @param {boolean} props.showDeleteIcon - Whether to show the delete icon
	 */
	FileInput: ({
		id,
		name,
		onChange,
		accept,
		preview,
		onDelete,
		error,
		showDeleteIcon,
	}) => {
		const { theme } 	   = useTheme()
		const hasError 		   = !!error
		const fileInputStyleId = `file-input-style-${id || name}`
		const fileInputClass   = `block w-full text-sm text-gray-900 
			border ${hasError ? "border-red-500" : "border-gray-200"} 
			rounded-md bg-gray-50 
			file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 
			file:text-sm file:font-semibold 
			hover:file:bg-opacity-90 transition duration-200`
		React.useEffect(() => {
			const styleEl 	   = document.createElement("style")
			styleEl.id 		   = fileInputStyleId
			styleEl.innerHTML  = `
				#${id || name}::file-selector-button{
					background-color: ${theme.primaryGradientStart}20 !important;
					color: ${theme.primaryGradientStart} !important;
				}
				#${id || name}::file-selector-button:hover{
					background-color: ${theme.primaryGradientStart}30 !important;
					filter: brightness(0.95);
				}
				#${id || name}:focus{
					border-color: ${hasError ? "#ef4444" : theme.primaryGradientStart} !important;
					box-shadow: 0 0 0 2px ${hasError ? "#ef444440" : `${theme.primaryGradientStart}40`} !important;
				}
				#${id || name}:hover{
					border-color: ${hasError ? "#ef4444" : theme.primaryGradientStart} !important;
				}
			`
			document.head.appendChild(styleEl)
			return() => {
				const existingStyle = document.getElementById(fileInputStyleId)
				if(existingStyle){
					existingStyle.remove()
				}
			}
		}, [theme.primaryGradientStart, id, name, hasError])
		return (
		<div>
			<div className="flex items-center">
				{preview && (
					<div
						className={`preview-container border ${
							hasError ? "border-red-500" : "border-gray-200"
						} rounded-md overflow-hidden bg-white relative`}
					>
						<a 
							href={preview} 
							target="_blank" 
							rel="noopener noreferrer"
							className="block w-full h-full"
						>
							<img
								src={preview}
								alt={`${name} preview`}
								className="w-full h-full object-contain cursor-pointer"
							/>
						</a>
						{onDelete && showDeleteIcon && (
							<div
								className="delete-icon"
								onClick={onDelete}
								title={`Delete ${name}`}
							>
								<X size={14} />
							</div>
						)}
					</div>
				)}
				<div className="flex-1">
					<input
					type="file"
					id={id || name}
					name={name}
					onChange={onChange}
					accept={accept}
					className={fileInputClass}
					aria-invalid={hasError}
					aria-describedby={hasError ? `${name}-error` : undefined}
					/>
				</div>
			</div>
			{hasError && (
				<div
					className="flex items-center mt-1 text-red-500 text-xs"
					id={`${name}-error`}
				>
					<AlertCircle className="w-3 h-3 mr-1" />
					<span>{error}</span>
				</div>
			)}
		</div>
		)
	},

	/**
	 * FormField - A container for form fields with label and error handling
	 *
	 * @param {Object} props - Component props
	 * @param {string} props.label - Label text for the form field
	 * @param {string} props.name - Name attribute for the form field
	 * @param {React.ReactNode} props.children - Child component (e.g., Input, Select)
	 * @param {string} [props.error] - Error message to display
	 * @param {boolean} [props.required=false] - Whether the field is required
	 * @param {boolean} [props.isCheckboxGroup=false] - Whether this contains multiple checkboxes (shows error at group level)
	 * @returns {JSX.Element} Form field container with label and error handling
	 */
	FormField: ({
		label,
		name,
		children,
		error,
		required = false,
		isCheckboxGroup = false,
	}) => {
		const hasError = !!error
		// Pass error to children only if it's NOT a checkbox group
		const shouldPassErrorToChildren = !isCheckboxGroup
		const childrenWithError = React.Children.map(children, (child) => {
			if(React.isValidElement(child)){
				return React.cloneElement(child, {
					error: shouldPassErrorToChildren ? error : undefined,
				})
			}
			return child
		})
		return (
			<div className="form-field space-y-1">
				<label
					htmlFor={name}
					// className="block text-sm font-medium text-gray-700"
					className="text-sm font-medium text-gray-700"
				>
					{label}
					{required && <span className="text-red-500 ml-1">*</span>}
				</label>
				{childrenWithError}
					{/* Show error at FormField level for checkbox groups */}
					{hasError && isCheckboxGroup && (
				<div
					className="flex items-center mt-1 text-red-500 text-xs"
					id={`${name}-error`}
				>
					<AlertCircle className="w-3 h-3 mr-1" />
					<span>{error}</span>
				</div>
				)}
			</div>
		)
	},

	/**
	 * Button - A styled button with gradient background
	 *
	 * @param {Object} props - Component props
	 * @param {React.ReactNode} props.children - Button content
	 * @param {Function} [props.onClick] - Click handler function
	 * @param {boolean} [props.loading=false] - Whether the button is in loading state
	 * @param {Object} [props.gradientColors] - Custom gradient colors { start, end }
	 * @param {string} [props.direction="to right"] - Gradient direction
	 * @param {string} [props.type="button"] - Button type (button, submit, reset)
	 * @returns {JSX.Element} Styled button with gradient background
	 */
	Button: ({
		children,
		onClick,
		loading = false,
		gradientColors,
		direction = "to right",
		type = "button",
	}) => {
		const { theme }  = useTheme()
		const startColor = gradientColors?.start || theme.primaryGradientStart
		const endColor   = gradientColors?.end || theme.primaryGradientEnd
		return (
			<button
				type={type}
				disabled={loading}
				onClick={onClick}
				className={`px-3 py-3 sm:px-6 sm:py-2 text-white rounded-md flex items-center justify-center transition duration-200 h-full${
				loading ? "opacity-75 cursor-not-allowed" : "hover:opacity-90"
				}`}
				style={{
					background: `linear-gradient(${direction}, ${startColor}, ${endColor})`,
				}}
			>
				{loading && (
					<svg
						className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
						className="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						strokeWidth="4"
						></circle>
						<path
						className="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
				)}
				{children}
			</button>
		)
	},

	/**
	 * GradientPreview - A visual preview of a linear gradient
	 *
	 * @param {Object} props - Component props
	 * @param {string} props.startColor - Starting color of the gradient (hex, rgb, etc.)
	 * @param {string} props.endColor - Ending color of the gradient (hex, rgb, etc.)
	 * @param {string} props.direction - Gradient direction (e.g., 'to right', '45deg')
	 * @returns {JSX.Element} Div element displaying the gradient
	 */
	GradientPreview: ({ startColor, endColor, direction }) => {
		const style = {
			height: "40px",
			borderRadius: "6px",
			background: `linear-gradient(${direction}, ${startColor}, ${endColor})`,
			width: "100%"
		}
		return(
			<div
				className="gradient-preview shadow-sm border border-gray-200"
				style={style}
				role="presentation"
				aria-label={`Gradient from ${startColor} to ${endColor}`}
			/>
		)
	},

	/**
	 * RichTextEditor - A rich text editor for formatted content like privacy policies
	 *
	 * @param {Object} props - Component props
	 * @param {string} props.id - Editor element ID
	 * @param {string} props.name - Editor name attribute
	 * @param {string} props.value - Editor value (HTML content)
	 * @param {Function} props.onChange - Change handler function
	 * @param {string} props.placeholder - Placeholder text
	 * @param {number} props.height - Editor height in pixels
	 * @param {string} props.error - Error message to display
	 * @param {Array} props.modules - Custom Quill modules configuration
	 * @param {Array} props.formats - Custom Quill formats configuration
	 */
	RichTextEditor: ({
		id,
		name,
		value,
		onChange,
		placeholder = "Enter your content here...",
		height = 300,
		error,
		modules: customModules,
		formats: customFormats,
	}) => {
		const { theme } = useTheme()
		const hasError = !!error
		const editorStyleId = `rich-editor-style-${id || name}`
		// Default modules configuration
		const defaultModules = {
			toolbar: [
				[{ header: [1, 2, 3, false] }],
				["bold", "italic", "underline", "strike"],
				[{ color: [] }, { background: [] }],
				[{ align: [] }],
				[{ list: "ordered" }, { list: "bullet" }],
				[{ indent: "-1" }, { indent: "+1" }],
				["link", "blockquote", "code-block"],
				["clean"],
			],
			clipboard: {
				matchVisual: false,
			},
		}
		// Default formats
		const defaultFormats = [
			"header",
			"bold",
			"italic",
			"underline",
			"strike",
			"color",
			"background",
			"align",
			"list",
			"bullet",
			"indent",
			"link",
			"blockquote",
			"code-block",
		]
		const modules = customModules || defaultModules
		const formats = customFormats || defaultFormats
		// Handle content change
		const handleChange = (content, delta, source, editor) => {
		if (onChange) {
			// Create a synthetic event object similar to regular inputs
			const syntheticEvent = {
			target: {
				name: name,
				value: content,
			},
			}
			onChange(syntheticEvent)
		}
		}
		// Apply custom styling
		React.useEffect(() => {
		const styleEl = document.createElement("style")
		styleEl.id = editorStyleId
		styleEl.innerHTML = `
			.ql-editor-${name} .ql-toolbar {
				border-top: 1px solid ${hasError ? "#ef4444" : "#e5e7eb"} !important;
				border-left: 1px solid ${hasError ? "#ef4444" : "#e5e7eb"} !important;
				border-right: 1px solid ${hasError ? "#ef4444" : "#e5e7eb"} !important;
				border-bottom: none !important;
				border-radius: 0.375rem 0.375rem 0 0 !important;
				background-color: #f9fafb;
			}
			.ql-editor-${name} .ql-container {
				border-bottom: 1px solid ${hasError ? "#ef4444" : "#e5e7eb"} !important;
				border-left: 1px solid ${hasError ? "#ef4444" : "#e5e7eb"} !important;
				border-right: 1px solid ${hasError ? "#ef4444" : "#e5e7eb"} !important;
				border-top: none !important;
				border-radius: 0 0 0.375rem 0.375rem !important;
			}
			.ql-editor-${name} .ql-editor {
				min-height: ${height}px !important;
				font-size: 14px !important;
				line-height: 1.5 !important;
			}
			.ql-editor-${name} .ql-editor.ql-blank::before {
				color: #9ca3af !important;
				font-style: normal !important;
			}
			.ql-editor-${name}:hover .ql-toolbar {
				border-color: ${hasError ? "#ef4444" : theme.primaryGradientStart} !important;
			}
			.ql-editor-${name}:hover .ql-container {
				border-color: ${hasError ? "#ef4444" : theme.primaryGradientStart} !important;
			}
			.ql-editor-${name} .ql-toolbar .ql-stroke {
				stroke: #374151 !important;
			}
			.ql-editor-${name} .ql-toolbar .ql-fill {
				fill: #374151 !important;
			}
			.ql-editor-${name} .ql-toolbar button:hover,
			.ql-editor-${name} .ql-toolbar button:focus,
			.ql-editor-${name} .ql-toolbar button.ql-active {
				background-color: ${theme.primaryGradientStart}20 !important;
				border-radius: 4px !important;
			}
			.ql-editor-${name} .ql-toolbar button:hover .ql-stroke {
				stroke: ${theme.primaryGradientStart} !important;
			}
			.ql-editor-${name} .ql-toolbar button:hover .ql-fill {
				fill: ${theme.primaryGradientStart} !important;
			}
		`
		document.head.appendChild(styleEl)
		return () => {
			const existingStyle = document.getElementById(editorStyleId)
			if (existingStyle) {
			existingStyle.remove()
			}
		}
		}, [theme.primaryGradientStart, name, hasError, height])
		return (
			<div className="relative">
				<div className={`ql-editor-${name}`}>
					<ReactQuill
						id={id || name}
						theme="snow"
						value={value || ""}
						onChange={handleChange}
						modules={modules}
						formats={formats}
						placeholder={placeholder}
						style={{
						backgroundColor: "#f9fafb",
						}}
					/>
				</div>
				{hasError && (
					<div
						className="flex items-center mt-1 text-red-500 text-xs"
						id={`${name}-error`}
					>
						<AlertCircle className="w-3 h-3 mr-1" />
						<span>{error}</span>
					</div>
				)}
			</div>
		)
	},
}
export default ThemeUI