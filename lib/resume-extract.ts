// ──────────────────────────────────────────────────────────────
// Extracts plain text from an uploaded resume file (.pdf, .docx,
// .txt). Server-side only — pdf-parse and mammoth are Node libs.
// ──────────────────────────────────────────────────────────────
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'

export class ExtractError extends Error {}

export async function extractResumeText(file: File): Promise<string> {
    const name = file.name.toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())

    if (name.endsWith('.pdf')) {
        const parser = new PDFParse({ data: buffer })
        try {
            const result = await parser.getText()
            return result.text.trim()
        } finally {
            await parser.destroy()
        }
    }

    if (name.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer })
        return result.value.trim()
    }

    if (name.endsWith('.txt')) {
        return buffer.toString('utf-8').trim()
    }

    throw new ExtractError(`Unsupported file type: ${file.name}. Use .pdf, .docx, or .txt.`)
}
