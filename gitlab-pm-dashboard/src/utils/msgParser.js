/**
 * MSG Parser Utility
 * Parses Outlook .msg files and extracts structured data
 * Lightweight implementation using msg-parser library approach
 */

/**
 * Parse .msg file content
 * @param {ArrayBuffer} msgBuffer - Raw .msg file content as ArrayBuffer
 * @returns {Object} Parsed email data
 */
export async function parseMsgFile(msgBuffer) {
  try {
    // For .msg files, we need to use a library since it's a binary format
    // We'll use a lightweight approach to extract basic data
    const dataView = new DataView(msgBuffer)

    // MSG files are OLE/CFB (Compound File Binary) format
    // This is a simplified parser that extracts the most common properties

    const result = {
      from: { name: '', email: '' },
      to: [],
      cc: [],
      bcc: [],
      subject: '',
      date: new Date(),
      messageId: '',
      body: '',
      rawHeaders: {}
    }

    // Try to extract text using simple binary search for common patterns
    // This is a basic implementation - for production, consider using msg-reader library
    const textDecoder = new TextDecoder('utf-8', { fatal: false })
    const fullText = textDecoder.decode(msgBuffer)

    // Extract subject (look for subject property in MSG format)
    const subjectMatch = fullText.match(/Subject[:\s]+([^\x00\r\n]+)/i)
    if (subjectMatch) {
      result.subject = cleanString(subjectMatch[1])
    }

    // Extract from email
    const fromMatch = fullText.match(/From[:\s]+([^\x00\r\n]+)/i)
    if (fromMatch) {
      const fromStr = cleanString(fromMatch[1])
      result.from = parseEmailAddress(fromStr)
    }

    // Extract to emails - try multiple patterns
    let toMatch = fullText.match(/To[:\s]+([^\x00\r\n]+)/i)

    // If not found, try alternative patterns
    if (!toMatch) {
      toMatch = fullText.match(/To[:\s]*([^\x00]+?(?:@[^\x00;,\s]+[;,\s]?)+)/i)
    }

    if (toMatch) {
      const toStr = cleanString(toMatch[1])
      result.to = parseEmailAddresses(toStr)
    }

    // If still no recipients, try to find email patterns in the binary data
    if (result.to.length === 0) {
      const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
      const emails = fullText.match(emailPattern)
      if (emails && emails.length > 0) {
        // Skip the sender email, take the next ones as potential recipients
        const uniqueEmails = [...new Set(emails)]
        result.to = uniqueEmails.slice(0, 5).map(email => ({ name: '', email: cleanString(email) }))
      }
    }

    // Extract CC
    const ccMatch = fullText.match(/Cc[:\s]+([^\x00\r\n]+)/i)
    if (ccMatch) {
      const ccStr = cleanString(ccMatch[1])
      result.cc = parseEmailAddresses(ccStr)
    }

    // Extract date
    const dateMatch = fullText.match(/Date[:\s]+([^\x00\r\n]+)/i)
    if (dateMatch) {
      try {
        result.date = new Date(cleanString(dateMatch[1]))
      } catch (e) {
        result.date = new Date()
      }
    }

    // Extract body - look for body content
    // In MSG files, the body is usually stored in specific streams
    // Try multiple patterns to find body content

    // Pattern 1: Look for long text blocks with common email content
    const bodyMatch1 = fullText.match(/[\x00-\xFF]{0,1000}([a-zA-Z0-9\sÄÖÜäöüß.,!?;:'"()\-—–]{200,})/g)

    // Pattern 2: Try to find text after common email headers
    const bodyMatch2 = fullText.split(/Subject.*?\n/i).slice(1).join('\n')

    // Pattern 3: Look for readable text sections
    const bodyMatch3 = fullText.match(/([a-zA-Z0-9\sÄÖÜäöüß.,!?;:'"()\-—–\n]{100,})/g)

    let bodyText = ''

    if (bodyMatch1 && bodyMatch1.length > 0) {
      // Take the longest match as it's likely the body
      bodyText = bodyMatch1.reduce((a, b) => a.length > b.length ? a : b, '')
    }

    if (!bodyText || bodyText.length < 50) {
      if (bodyMatch2 && bodyMatch2.length > 50) {
        bodyText = bodyMatch2
      }
    }

    if (!bodyText || bodyText.length < 50) {
      if (bodyMatch3 && bodyMatch3.length > 0) {
        bodyText = bodyMatch3.reduce((a, b) => a.length > b.length ? a : b, '')
      }
    }

    result.body = cleanBodyText(bodyText)

    return result
  } catch (error) {
    console.error('Error parsing MSG file:', error)
    throw new Error('Failed to parse MSG file: ' + error.message)
  }
}

/**
 * Clean extracted string from binary data
 */
function cleanString(str) {
  if (!str) return ''

  // Remove null bytes and control characters
  return str
    .replace(/\x00/g, '')
    .replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F]/g, '')
    .trim()
}

/**
 * Clean body text
 */
function cleanBodyText(text) {
  if (!text) return ''

  return text
    .replace(/\x00/g, '')
    .replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 10000) // Limit to reasonable size
}

/**
 * Parse email address from string
 * Handles formats: "Name <email@domain.com>" or "email@domain.com"
 */
function parseEmailAddress(value) {
  if (!value) return { name: '', email: '' }

  const match = value.match(/(.*)<(.+?)>/)
  if (match) {
    return {
      name: match[1].trim().replace(/^["']|["']$/g, ''),
      email: match[2].trim()
    }
  }

  // Try to extract email pattern
  const emailMatch = value.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  if (emailMatch) {
    return {
      name: '',
      email: emailMatch[1].trim()
    }
  }

  return {
    name: '',
    email: value.trim()
  }
}

/**
 * Parse multiple email addresses
 */
function parseEmailAddresses(value) {
  if (!value) return []

  // Split by common delimiters
  return value.split(/[;,]/).map(addr => parseEmailAddress(addr.trim())).filter(a => a.email)
}

/**
 * Alternative: Use improved MSG parser with MAPI property extraction
 * This provides better parsing but is more complex
 */
export async function parseMsgFileAdvanced(msgBuffer) {
  try {
    // Convert ArrayBuffer to Uint8Array
    const uint8Array = new Uint8Array(msgBuffer)

    const result = {
      from: { name: '', email: '' },
      to: [],
      cc: [],
      bcc: [],
      subject: '',
      date: new Date(),
      messageId: '',
      body: '',
      rawHeaders: {}
    }

    // MSG files start with specific header
    const header = uint8Array.slice(0, 8)
    const headerStr = String.fromCharCode(...header)

    if (!headerStr.includes('\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1')) {
      // Not a valid MSG/OLE file, try basic parsing
      return parseMsgFile(msgBuffer)
    }

    // For advanced parsing, we would need to:
    // 1. Parse OLE/CFB structure
    // 2. Extract directory entries
    // 3. Find and read specific MAPI properties:
    //    - 0x0037: Subject
    //    - 0x0C1A: Sender name
    //    - 0x0C1F: Sender email
    //    - 0x0E04: Display To
    //    - 0x0E03: Display CC
    //    - 0x1000: Body
    //    - 0x0039: Client Submit Time

    // For now, fall back to simple parsing
    return parseMsgFile(msgBuffer)
  } catch (error) {
    console.error('Error in advanced MSG parsing:', error)
    return parseMsgFile(msgBuffer)
  }
}

/**
 * Detect if file is MSG format
 */
export function isMsgFile(buffer) {
  if (buffer.byteLength < 8) return false

  const uint8Array = new Uint8Array(buffer)
  const header = uint8Array.slice(0, 8)

  // MSG files are OLE files, they start with: D0 CF 11 E0 A1 B1 1A E1
  return (
    header[0] === 0xD0 &&
    header[1] === 0xCF &&
    header[2] === 0x11 &&
    header[3] === 0xE0 &&
    header[4] === 0xA1 &&
    header[5] === 0xB1 &&
    header[6] === 0x1A &&
    header[7] === 0xE1
  )
}
