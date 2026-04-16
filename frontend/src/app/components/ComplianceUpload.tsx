"use client";

import { useState } from "react";
import { getRuntimeApiBase } from "@/lib/api";

interface ComplianceUploadProps {
  onUploadComplete: () => void;
}

export default function ComplianceUpload({ onUploadComplete }: ComplianceUploadProps) {
  const [frameworkName, setFrameworkName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleUpload() {
    if (!frameworkName.trim() || !fileContent.trim()) return;

    setUploading(true);
    setResult(null);

    try {
      let content: unknown;
      try {
        content = JSON.parse(fileContent);
      } catch {
        setResult("Invalid JSON. Please paste valid JSON content.");
        setUploading(false);
        return;
      }

      const res = await fetch(`${getRuntimeApiBase()}/api/compliance/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          framework_name: frameworkName,
          content,
          filename: "document.json",
        }),
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setResult(`Uploaded "${data.name}" with ${data.controls_parsed} controls.`);
      setFrameworkName("");
      setFileContent("");
      onUploadComplete();
    } catch {
      setResult("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "var(--bg-deeper)",
        border: "1px dashed color-mix(in srgb, var(--bg-border) 55%, transparent)",
      }}
    >
      <div className="flex flex-col items-center text-center mb-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
          style={{ background: "color-mix(in srgb, var(--orange) 12%, transparent)" }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 32, color: "var(--orange-light)" }}
          >
            cloud_upload
          </span>
        </div>
        <h3
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: "16px",
            color: "var(--text-primary)",
          }}
        >
          Upload Compliance Framework
        </h3>
        <p
          className="mt-1"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--text-ghost)",
          }}
        >
          JSON controls · CIS · NIST · PCI-DSS
        </p>
      </div>

      <input
        type="text"
        placeholder="Framework name (e.g., CIS Controls v8)"
        value={frameworkName}
        onChange={(e) => setFrameworkName(e.target.value)}
        className="frag-input w-full mb-3"
      />

      <textarea
        placeholder='[{"control_id": "1.1", "title": "...", "description": "...", "category": "...", "severity": "medium"}]'
        value={fileContent}
        onChange={(e) => setFileContent(e.target.value)}
        rows={5}
        className="frag-input w-full mb-4"
        style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}
      />

      <button
        onClick={handleUpload}
        disabled={uploading || !frameworkName.trim() || !fileContent.trim()}
        className="accent-gradient w-full py-3 rounded-xl text-white font-semibold text-xs uppercase disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ letterSpacing: "0.12em" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
          {uploading ? "progress_activity" : "upload_file"}
        </span>
        {uploading ? "Uploading…" : "Upload Framework"}
      </button>

      {result && (
        <p
          className="mt-4"
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
          }}
        >
          {result}
        </p>
      )}
    </div>
  );
}
