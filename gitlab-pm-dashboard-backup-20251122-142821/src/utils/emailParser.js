/**
 * Email Parser Utility
 * Parses .eml files and extracts structured data
 * Lightweight implementation without external dependencies
 */

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
    bcc: parseEmailAddresses(headers['bcc'] || ''),
    subject: decodeHeader(headers['subject'] || ''),
    date: parseEmailDate(headers['date'] || ''),
    messageId: headers['message-id'] || '',
    body: plainText,
    rawHeaders: headers
  }
}

/**
 * Parse email address from header value
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

  return value.split(',').map(addr => parseEmailAddress(addr.trim()))
}

/**
 * Decode RFC 2047 encoded headers (e.g., =?UTF-8?Q?...?=)
 */
function decodeHeader(value) {
  if (!value) return ''

  // Simple implementation - handles most common cases
  return value.replace(/=\?([^?]+)\?([QB])\?([^?]+)\?=/gi, (match, charset, encoding, encoded) => {
    try {
      if (encoding.toUpperCase() === 'Q') {
        // Quoted-printable
        return encoded.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/g, (m, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        )
      } else if (encoding.toUpperCase() === 'B') {
        // Base64
        return atob(encoded)
      }
    } catch (e) {
      console.warn('Failed to decode header:', e)
    }
    return match
  })
}

/**
 * Parse email date to JavaScript Date object
 */
function parseEmailDate(dateStr) {
  if (!dateStr) return new Date()

  try {
    // Remove extra whitespace and parse
    const cleaned = dateStr.replace(/\s+/g, ' ').trim()
    return new Date(cleaned)
  } catch (e) {
    return new Date()
  }
}

/**
 * Extract plain text from email body
 * Handles multipart/alternative and text/html
 */
function extractPlainText(body, contentType) {
  if (!body) return ''

  // Check if multipart
  const boundaryMatch = contentType?.match(/boundary=["']?([^"'\s;]+)/)
  if (boundaryMatch) {
    const boundary = boundaryMatch[1]
    const parts = body.split(`--${boundary}`)

    // Find text/plain part
    for (const part of parts) {
      if (part.includes('Content-Type: text/plain')) {
        const textStart = part.indexOf('\n\n')
        if (textStart !== -1) {
          return cleanText(part.substring(textStart).trim())
        }
      }
    }

    // Fallback: find first text part
    for (const part of parts) {
      const textStart = part.indexOf('\n\n')
      if (textStart !== -1) {
        const text = part.substring(textStart).trim()
        if (text && !text.startsWith('<')) {
          return cleanText(text)
        }
      }
    }
  }

  // Single part - clean and return
  return cleanText(body)
}

/**
 * Clean text content
 * Remove quoted-printable encoding, HTML tags, etc.
 */
function cleanText(text) {
  if (!text) return ''

  // Remove HTML tags if present
  let cleaned = text.replace(/<[^>]+>/g, ' ')

  // Decode quoted-printable (=XX)
  cleaned = cleaned.replace(/=([0-9A-F]{2})/g, (match, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16))
    } catch (e) {
      return match
    }
  })

  // Remove soft line breaks (=\n)
  cleaned = cleaned.replace(/=\n/g, '')

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  return cleaned
}

/**
 * Auto-detect tags from email content
 */
export function detectEmailTags(subject, body) {
  const tags = []
  const content = `${subject} ${body}`.toLowerCase()

  // Decision indicators
  if (content.match(/\b(approve|approved|approval|decision|decided|go ahead|green light)\b/)) {
    tags.push('decision')
  }

  // Approval indicators
  if (content.match(/\b(sign[ -]?off|signed[ -]?off|approved|approval|accept|accepted)\b/)) {
    tags.push('approval')
  }

  // Escalation indicators
  if (content.match(/\b(urgent|critical|escalate|escalation|help needed|blocker)\b/)) {
    tags.push('escalation')
  }

  // Scope change indicators
  if (content.match(/\b(scope change|change request|additional|requirement|add feature)\b/)) {
    tags.push('scope-change')
  }

  // Priority indicators
  if (content.match(/\b(priority|re-?prioritize|priority change|urgent|high priority)\b/)) {
    tags.push('priority')
  }

  // Risk indicators
  if (content.match(/\b(risk|concern|issue|problem|delay|slippage)\b/)) {
    tags.push('risk')
  }

  return [...new Set(tags)] // Remove duplicates
}

/**
 * Extract potential epic/issue references from content
 */
export function extractReferences(subject, body) {
  const references = []
  const content = `${subject} ${body}`

  // Look for issue references (#123, issue-123, etc.)
  const issueMatches = content.match(/#(\d+)|issue[- ](\d+)/gi)
  if (issueMatches) {
    issueMatches.forEach(match => {
      const num = match.match(/\d+/)
      if (num) references.push({ type: 'issue', id: num[0] })
    })
  }

  // Look for epic references
  const epicMatches = content.match(/epic[- ](\d+)|&(\d+)/gi)
  if (epicMatches) {
    epicMatches.forEach(match => {
      const num = match.match(/\d+/)
      if (num) references.push({ type: 'epic', id: num[0] })
    })
  }

  return references
}
