/**
 * MSG Parser Utility
 * Professional .msg file parser using @kenjiuno/msgreader
 * Provides full MAPI property extraction and proper OLE/CFB parsing
 */

import MsgReader from '@kenjiuno/msgreader'

/**
 * Parse .msg file content with professional library
 * @param {ArrayBuffer} msgBuffer - Raw .msg file content as ArrayBuffer
 * @returns {Object} Parsed email data
 */
export async function parseMsgFile(msgBuffer) {
  try {
    // Convert ArrayBuffer to Buffer (required by msgreader)
    const buffer = Buffer.from(msgBuffer)

    // Parse the MSG file
    const msgReader = new MsgReader(buffer)
    const fileData = msgReader.getFileData()

    // Extract email data from MAPI properties
    const result = {
      from: { name: '', email: '' },
      to: [],
      cc: [],
      bcc: [],
      subject: fileData.subject || '',
      date: fileData.creationTime ? new Date(fileData.creationTime) : new Date(),
      messageId: fileData.messageId || '',
      body: fileData.body || fileData.bodyHTML || '',
      rawHeaders: fileData.headers || {},
      attachments: []
    }

    // Parse sender information
    if (fileData.senderName || fileData.senderEmail) {
      result.from = {
        name: fileData.senderName || '',
        email: fileData.senderEmail || fileData.senderSmtpAddress || ''
      }
    }

    // Parse recipients (To)
    if (fileData.recipients && Array.isArray(fileData.recipients)) {
      fileData.recipients.forEach(recipient => {
        const recipientData = {
          name: recipient.name || '',
          email: recipient.email || recipient.smtpAddress || ''
        }

        // Categorize by recipient type
        if (recipient.recipType === 1 || recipient.recipientType === 'to') {
          result.to.push(recipientData)
        } else if (recipient.recipType === 2 || recipient.recipientType === 'cc') {
          result.cc.push(recipientData)
        } else if (recipient.recipType === 3 || recipient.recipientType === 'bcc') {
          result.bcc.push(recipientData)
        } else {
          // Default to 'to' if type is unclear
          result.to.push(recipientData)
        }
      })
    }

    // Parse attachments
    if (fileData.attachments && Array.isArray(fileData.attachments)) {
      result.attachments = fileData.attachments.map(att => ({
        filename: att.fileName || att.name || 'attachment',
        contentType: att.mimeType || att.extension || 'application/octet-stream',
        size: att.dataSize || 0,
        data: att.content || null // Base64 or binary data
      }))
    }

    // Prefer plain text body, fall back to HTML if needed
    if (!result.body && fileData.bodyHTML) {
      // Strip HTML tags for plain text preview
      result.body = stripHtmlTags(fileData.bodyHTML)
    }

    // Clean up the body text
    result.body = cleanBodyText(result.body)

    return result
  } catch (error) {
    console.error('Error parsing MSG file with msgreader:', error)
    // Fallback to basic parsing if library fails
    return parseMsgFileFallback(msgBuffer)
  }
}

/**
 * Strip HTML tags from text
 */
function stripHtmlTags(html) {
  if (!html) return ''

  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ')

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim()

  return text
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
    .substring(0, 50000) // Increased limit for longer emails
}

/**
 * Fallback parser if msgreader fails
 * Uses basic binary pattern matching
 */
function parseMsgFileFallback(msgBuffer) {
  try {
    const textDecoder = new TextDecoder('utf-8', { fatal: false })
    const fullText = textDecoder.decode(msgBuffer)

    const result = {
      from: { name: '', email: '' },
      to: [],
      cc: [],
      bcc: [],
      subject: '',
      date: new Date(),
      messageId: '',
      body: '',
      rawHeaders: {},
      attachments: []
    }

    // Extract subject
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

    // Extract to emails
    let toMatch = fullText.match(/To[:\s]+([^\x00\r\n]+)/i)
    if (!toMatch) {
      toMatch = fullText.match(/To[:\s]*([^\x00]+?(?:@[^\x00;,\s]+[;,\s]?)+)/i)
    }
    if (toMatch) {
      const toStr = cleanString(toMatch[1])
      result.to = parseEmailAddresses(toStr)
    }

    // If still no recipients, extract email patterns
    if (result.to.length === 0) {
      const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
      const emails = fullText.match(emailPattern)
      if (emails && emails.length > 0) {
        const uniqueEmails = [...new Set(emails)]
        result.to = uniqueEmails.slice(0, 5).map(email => ({ name: '', email: cleanString(email) }))
      }
    }

    // Extract body with multiple strategies
    const bodyMatch1 = fullText.match(/[\x00-\xFF]{0,1000}([a-zA-Z0-9\sÄÖÜäöüß.,!?;:'"()\-—–]{200,})/g)
    const bodyMatch2 = fullText.split(/Subject.*?\n/i).slice(1).join('\n')
    const bodyMatch3 = fullText.match(/([a-zA-Z0-9\sÄÖÜäöüß.,!?;:'"()\-—–\n]{100,})/g)

    let bodyText = ''
    if (bodyMatch1 && bodyMatch1.length > 0) {
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
    console.error('Error in fallback MSG parsing:', error)
    throw new Error('Failed to parse MSG file: ' + error.message)
  }
}

/**
 * Clean extracted string from binary data
 */
function cleanString(str) {
  if (!str) return ''
  return str
    .replace(/\x00/g, '')
    .replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F]/g, '')
    .trim()
}

/**
 * Parse email address from string
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
  return value.split(/[;,]/).map(addr => parseEmailAddress(addr.trim())).filter(a => a.email)
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
