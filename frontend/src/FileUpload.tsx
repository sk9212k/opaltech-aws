import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

const allowedExtensions = [".xml", ".csv", ".json", ".edi"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface UploadFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
}

export default function FileUpload() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [message, setMessage] = useState("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const valid: UploadFile[] = [];
    const rejected: string[] = [];

    acceptedFiles.forEach(file => {
      const lowerName = file.name.toLowerCase();
      const hasValidExt = allowedExtensions.some(ext => lowerName.endsWith(ext));
      const withinSize = file.size <= MAX_FILE_SIZE;

      if (hasValidExt && withinSize) {
        valid.push({ file, progress: 0, status: "pending" });
      } else {
        if (!hasValidExt) rejected.push(`${file.name} (invalid type)`);
        if (!withinSize) rejected.push(`${file.name} (too large)`);
      }
    });

    setFiles(valid);

    if (rejected.length) {
      setMessage(
        `Some files were rejected: ${rejected.join(", ")}. 
         Allowed: XML, CSV, JSON, EDI (max 5 MB each).`
      );
    } else {
      setMessage("");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleUpload = async () => {
    if (!files.length) return;

    const updatedFiles = [...files];
    setFiles(updatedFiles);

    for (let i = 0; i < updatedFiles.length; i++) {
      const uploadFile = updatedFiles[i];
      uploadFile.status = "uploading";
      setFiles([...updatedFiles]);

      const formData = new FormData();
      formData.append("file", uploadFile.file);

      try {
        await axios.post("/api/FileUpload/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              uploadFile.progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setFiles([...updatedFiles]);
            }
          },
        });

        uploadFile.status = "success";
        uploadFile.progress = 100;
        setFiles([...updatedFiles]);
      } catch (err) {
        uploadFile.status = "error";
        setFiles([...updatedFiles]);
      }
    }

    setMessage("✅ Upload process finished. Check statuses above.");
  };

  return (
    <div className="max-w-xl mx-auto p-4 border rounded-xl shadow-md bg-white">
      <h2 className="text-xl font-semibold mb-4">OpalTech – File Upload</h2>

      <div
        {...getRootProps({
          className:
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer " +
            (isDragActive ? "bg-blue-50" : "bg-gray-50"),
        })}
      >
        {/* 🔑 This makes the whole box clickable */}
        <input {...getInputProps()} style={{ display: "none" }} />

        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p>
            Drag and drop <strong>or click</strong> to select XML, CSV, JSON, or EDI files (≤ 5MB)
          </p>
        )}
      </div>

      <ul className="mt-4 text-sm text-gray-700 space-y-2">
        {files.map((uf, i) => (
          <li key={i} className="border p-2 rounded bg-gray-50">
            📄 {uf.file.name} ({(uf.file.size / 1024).toFixed(1)} KB)
            <div className="w-full bg-gray-200 rounded h-2 mt-2">
              <div
                className={`h-2 rounded ${
                  uf.status === "error"
                    ? "bg-red-500"
                    : uf.status === "success"
                    ? "bg-green-500"
                    : "bg-blue-500"
                }`}
                style={{ width: `${uf.progress}%` }}
              ></div>
            </div>
            <p className="text-xs mt-1">
              {uf.status === "uploading" && `Uploading… ${uf.progress}%`}
              {uf.status === "success" && "✅ Success"}
              {uf.status === "error" && "❌ Failed"}
              {uf.status === "pending" && "⏳ Pending"}
            </p>
          </li>
        ))}
      </ul>

      <button
        onClick={handleUpload}
        disabled={!files.length || files.some(f => f.status === "uploading")}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {files.some(f => f.status === "uploading") ? "Uploading..." : "Upload"}
      </button>

      {message && <p className="mt-3 text-sm text-gray-800">{message}</p>}
    </div>
  );
}
