/**
 * Consolidated Email Service
 * Combines email parsing functionality for .eml, .html, and .msg files
 * Created by consolidating emailParser.js, htmlEmailParser.js, and msgParser.js
 */

// ============================================================================
// EML PARSER SECTION (from emailParser.js)
// ============================================================================

/**
 * Parse .eml file content
 * @param {string} emlContent - Raw .eml file content
 * @returns {Object} Parsed email data
 */
export function parseEmlFile(emlContent) {
  const lines = emlContent.split('\n')
  const headers = {}
  let body = ''
  let isBody = false
  let currentHeader = ''

  // Parse headers and body
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (!isBody) {
      // Empty line marks start of body
      if (line.trim() === '') {
        isBody = true
        continue
      }

      // Continuation of previous header (starts with whitespace)
      if (line.match(/^\s/) && currentHeader) {
        headers[currentHeader] += ' ' + line.trim()
      } else {
        // New header line
        const match = line.match(/^([^:]+):\s*(.*)/)
        if (match) {
          currentHeader = match[1].toLowerCase()
          headers[currentHeader] = match[2].trim()
        }
      }
    } else {
      body += line + '\n'
    }
  }

  // Extract plain text from body (handles multipart)
  const plainText = extractPlainText(body, headers['content-type'])

  return {
    from: parseEmailAddress(headers['from'] || ''),
    to: parseEmailAddresses(headers['to'] || ''),
    cc: parseEmailAddresses(headers['cc'] || ''),
    subject: headers['subject'] || '',
    date: headers['date'] || '',
    body: plainText,
    headers: headers
  }
}

/**
 * Extract plain text from email body
 * Handles multipart messages and various encodings
 */
function extractPlainText(body, contentType = '') {
  // Handle multipart messages
  if (contentType.includes('multipart')) {
    const boundary = contentType.match(/boundary=["']?([^"';]+)/)
    if (boundary) {
      const parts = body.split(`--${boundary[1]}`)

      // Look for text/plain part first
      for (const part of parts) {
        if (part.includes('Content-Type: text/plain')) {
          const partLines = part.split('\n')
          let partBody = ''
          let inBody = false

          for (const line of partLines) {
            if (inBody) {
              partBody += line + '\n'
            } else if (line.trim() === '') {
              inBody = true
            }
          }

          return decodeBody(partBody, part)
        }
      }

      // Fall back to text/html if no plain text
      for (const part of parts) {
        if (part.includes('Content-Type: text/html')) {
          const partLines = part.split('\n')
          let partBody = ''
          let inBody = false

          for (const line of partLines) {
            if (inBody) {
              partBody += line + '\n'
            } else if (line.trim() === '') {
              inBody = true
            }
          }

          return stripHtml(decodeBody(partBody, part))
        }
      }
    }
  }

  // Handle HTML content
  if (contentType.includes('text/html')) {
    return stripHtml(decodeBody(body))
  }

  // Default to plain text
  return decodeBody(body)
}

/**
 * Decode email body based on encoding
 */
function decodeBody(body, headers = '') {
  // Check for quoted-printable encoding
  if (headers.includes('Content-Transfer-Encoding: quoted-printable') ||
      body.includes('=3D') || body.includes('=20')) {
    return decodeQuotedPrintable(body)
  }

  // Check for base64 encoding
  if (headers.includes('Content-Transfer-Encoding: base64')) {
    try {
      return atob(body.replace(/\s/g, ''))
    } catch (e) {
      return body
    }
  }

  return body
}

/**
 * Decode quoted-printable encoding
 */
function decodeQuotedPrintable(text) {
  return text
    .replace(/=\r?\n/g, '') // Remove soft line breaks
    .replace(/=([0-9A-F]{2})/gi, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16))
    })
}

/**
 * Strip HTML tags and decode entities
 */
function stripHtml(html) {
  // Remove style and script content
  let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')

  // Replace common tags with appropriate text
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>/gi, '\n\n')
  text = text.replace(/<\/div>/gi, '\n')
  text = text.replace(/<\/tr>/gi, '\n')
  text = text.replace(/<\/td>/gi, '\t')

  // Remove remaining tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&#(\d+);/g, (match, num) => String.fromCharCode(num))

  // Clean up excessive whitespace
  text = text.replace(/\t+/g, '\t')
  text = text.replace(/ +/g, ' ')
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}

/**
 * Parse email address from header
 */
function parseEmailAddress(addressStr) {
  if (!addressStr) return { name: '', email: '' }

  // Handle "Name" <email@domain.com> format
  const match = addressStr.match(/"?([^"<]*)"?\s*<([^>]+)>/)
  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim()
    }
  }

  // Plain email address
  return {
    name: '',
    email: addressStr.trim()
  }
}

/**
 * Parse multiple email addresses
 */
function parseEmailAddresses(addressStr) {
  if (!addressStr) return []

  const addresses = addressStr.split(/,\s*/)
  return addresses.map(addr => parseEmailAddress(addr))
}

// ============================================================================
// HTML EMAIL PARSER SECTION (from htmlEmailParser.js)
// ============================================================================

/**
 * Parse HTML email file
 * @param {string} htmlContent - Raw HTML email content
 * @returns {Object} Parsed email data
 */
export function parseHtmlEmail(htmlContent) {
  // Extract metadata from HTML comments or meta tags
  const metadata = extractHtmlMetadata(htmlContent)

  // Extract text content
  const textContent = stripHtml(htmlContent)

  // Try to extract email headers from the HTML structure
  const from = extractEmailField(htmlContent, 'from') || metadata.from || ''
  const to = extractEmailField(htmlContent, 'to') || metadata.to || ''
  const subject = extractEmailField(htmlContent, 'subject') ||
                   extractTitle(htmlContent) ||
                   metadata.subject || ''
  const date = extractEmailField(htmlContent, 'date') || metadata.date || ''

  return {
    from: parseEmailAddress(from),
    to: parseEmailAddresses(to),
    cc: [],
    subject: subject,
    date: date,
    body: textContent,
    originalHtml: htmlContent
  }
}

/**
 * Extract metadata from HTML
 */
function extractHtmlMetadata(html) {
  const metadata = {}

  // Check meta tags
  const metaTags = html.match(/<meta\s+[^>]*>/gi) || []
  metaTags.forEach(tag => {
    const nameMatch = tag.match(/name=["']([^"']+)["']/)
    const contentMatch = tag.match(/content=["']([^"']+)["']/)
    if (nameMatch && contentMatch) {
      metadata[nameMatch[1].toLowerCase()] = contentMatch[1]
    }
  })

  return metadata
}

/**
 * Extract title from HTML
 */
function extractTitle(html) {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
  return titleMatch ? titleMatch[1].trim() : ''
}

/**
 * Extract email field from HTML structure
 */
function extractEmailField(html, field) {
  // Look for common patterns in email HTML
  const patterns = [
    new RegExp(`${field}:\\s*</[^>]+>\\s*([^<]+)`, 'i'),
    new RegExp(`class=["'][^"']*${field}[^"']*["'][^>]*>([^<]+)`, 'i'),
    new RegExp(`<b>${field}:</b>\\s*([^<]+)`, 'i')
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return ''
}

// ============================================================================
// MSG PARSER SECTION (from msgParser.js)
// ============================================================================

/**
 * Parse .msg file (Outlook message format)
 * This is a simplified parser for basic .msg files
 * For full support, consider using a dedicated library
 */
export function parseMsgFile(msgContent) {
  // Check if it's a binary .msg file
  if (msgContent.includes('\x00')) {
    return parseBinaryMsg(msgContent)
  }

  // Otherwise try to parse as text-based format
  return parseTextMsg(msgContent)
}

/**
 * Parse binary MSG file (simplified)
 * Extracts readable text portions
 */
function parseBinaryMsg(content) {
  // This is a very simplified parser that extracts readable strings
  // A full implementation would need to parse the OLE compound file structure

  const strings = []
  let currentString = ''

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const code = char.charCodeAt(0)

    // Collect printable ASCII characters
    if (code >= 32 && code <= 126) {
      currentString += char
    } else if (currentString.length > 3) {
      // Save strings longer than 3 characters
      strings.push(currentString)
      currentString = ''
    } else {
      currentString = ''
    }
  }

  if (currentString.length > 3) {
    strings.push(currentString)
  }

  // Try to identify common email fields
  const result = {
    from: { name: '', email: '' },
    to: [],
    cc: [],
    subject: '',
    date: '',
    body: ''
  }

  // Look for patterns in extracted strings
  strings.forEach((str, index) => {
    // Email patterns
    const emailMatch = str.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
    if (emailMatch && !result.from.email) {
      result.from.email = emailMatch[1]
    }

    // Subject patterns
    if (str.toLowerCase().includes('subject:')) {
      const subjectIndex = str.toLowerCase().indexOf('subject:') + 8
      result.subject = str.substring(subjectIndex).trim()
    } else if (str.toLowerCase() === 'subject' && index < strings.length - 1) {
      result.subject = strings[index + 1]
    }

    // Date patterns
    const dateMatch = str.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)
    if (dateMatch && !result.date) {
      result.date = dateMatch[0]
    }
  })

  // Combine longer strings as potential body content
  const longStrings = strings.filter(s => s.length > 50)
  if (longStrings.length > 0) {
    result.body = longStrings.join('\n')
  }

  return result
}

/**
 * Parse text-based MSG format
 */
function parseTextMsg(content) {
  // Some .msg files are exported as plain text
  // Try to parse similar to .eml format

  const lines = content.split('\n')
  const headers = {}
  let body = ''
  let isBody = false

  for (const line of lines) {
    if (!isBody) {
      if (line.trim() === '' || line.startsWith('---')) {
        isBody = true
        continue
      }

      const match = line.match(/^([^:]+):\s*(.*)/)
      if (match) {
        const key = match[1].toLowerCase()
        headers[key] = match[2].trim()
      }
    } else {
      body += line + '\n'
    }
  }

  return {
    from: parseEmailAddress(headers['from'] || headers['sender'] || ''),
    to: parseEmailAddresses(headers['to'] || headers['recipient'] || ''),
    cc: parseEmailAddresses(headers['cc'] || ''),
    subject: headers['subject'] || headers['re'] || '',
    date: headers['date'] || headers['sent'] || headers['received'] || '',
    body: body.trim()
  }
}

// ============================================================================
// UNIFIED EMAIL PARSING
// ============================================================================

/**
 * Parse any email file based on extension
 * @param {string} content - File content
 * @param {string} filename - File name with extension
 * @returns {Object} Parsed email data
 */
export function parseEmailFile(content, filename) {
  const extension = filename.toLowerCase().split('.').pop()

  switch (extension) {
    case 'eml':
      return parseEmlFile(content)
    case 'html':
    case 'htm':
      return parseHtmlEmail(content)
    case 'msg':
      return parseMsgFile(content)
    default:
      // Try to detect format from content
      if (content.includes('<!DOCTYPE') || content.includes('<html')) {
        return parseHtmlEmail(content)
      } else if (content.includes('From:') || content.includes('Subject:')) {
        return parseEmlFile(content)
      } else {
        return parseMsgFile(content)
      }
  }
}

/**
 * Format parsed email for display
 * @param {Object} emailData - Parsed email data
 * @returns {string} Formatted email text
 */
export function formatEmail(emailData) {
  const lines = []

  if (emailData.from) {
    const from = emailData.from.name
      ? `${emailData.from.name} <${emailData.from.email}>`
      : emailData.from.email
    lines.push(`From: ${from}`)
  }

  if (emailData.to && emailData.to.length > 0) {
    const to = emailData.to.map(addr =>
      addr.name ? `${addr.name} <${addr.email}>` : addr.email
    ).join(', ')
    lines.push(`To: ${to}`)
  }

  if (emailData.cc && emailData.cc.length > 0) {
    const cc = emailData.cc.map(addr =>
      addr.name ? `${addr.name} <${addr.email}>` : addr.email
    ).join(', ')
    lines.push(`CC: ${cc}`)
  }

  if (emailData.subject) {
    lines.push(`Subject: ${emailData.subject}`)
  }

  if (emailData.date) {
    lines.push(`Date: ${emailData.date}`)
  }

  if (lines.length > 0) {
    lines.push('---')
  }

  if (emailData.body) {
    lines.push(emailData.body)
  }

  return lines.join('\n')
}