'use client';

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ProcessedDocument } from "@/lib/types";
import { processDocument } from "@/app/actions";
import FileUploader from "@/components/file-uploader";
import DocInteractionView from "@/components/doc-interaction-view";
import DashboardLayout from "@/components/dashboard-layout";
import SummaryOptions from "@/components/summary-options";
import { extractTextFromImage } from "@/lib/ocr";

interface ProcessDocumentInput {
  name: string;
  content: string;
  summaryLength: "short" | "medium" | "long";
}

export default function Dashboard() {
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeDoc, setActiveDoc] = useState<ProcessedDocument | null>(null);
  const [summaryLength, setSummaryLength] =
    useState<"short" | "medium" | "long">("medium");

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setActiveDoc(null);

    try {
      toast({
        title: "Processing Document...",
        description: "Extracting content. Please wait...",
      });

      let extractedText = "";

      if (file.type === "application/pdf") {
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js");
      
        // Point worker to public folder (NOT imported)
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";
      
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((it: any) => it.str).join("") + "\n";
        }
      
        extractedText = text;
      }
      else if (file.type.startsWith("image/")) {
        extractedText = await extractTextFromImage(file);
      }

      const newDoc = await processDocument({
        name: file.name,
        content: extractedText,
        summaryLength,
      } as ProcessDocumentInput);

      setActiveDoc(newDoc);

      toast({
        title: "Processing Complete!",
        description: "Your document is ready.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: err.message || "Unexpected error occurred.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewDocument = () => setActiveDoc(null);

  return (
    <DashboardLayout
      onNewDocument={handleNewDocument}
      showNewDocumentButton={!!activeDoc || isProcessing}
    >
      <main className="h-full overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          {isProcessing || activeDoc ? (
            <DocInteractionView
              isLoading={isProcessing}
              docName={activeDoc?.name || "Processing..."}
              docContent={activeDoc?.content || ""}
              summary={activeDoc?.summary || ""}
              challenges={activeDoc?.challenges || []}
            />
          ) : (
            <>
              <SummaryOptions
                selected={summaryLength}
                onSelect={setSummaryLength}
              />
              <FileUploader
                onFileSelect={handleFileUpload}
                isProcessing={isProcessing}
              />
            </>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
