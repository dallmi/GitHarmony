/**
 * MSG Parser Utility
 * Corporate-friendly .msg file parser using only native JavaScript
 * No external binary parsing libraries that might be blocked
 */

/**
 * Parse .msg file content using pattern matching
 * @param {ArrayBuffer} msgBuffer - Raw .msg file content as ArrayBuffer
 * @returns {Object} Parsed email data
 */
export async function parseMsgFile(msgBuffer) {
  try {
    // Try both UTF-8 and UTF-16LE decoders for Unicode MSG files
    const utf8Decoder = new TextDecoder('utf-8', { fatal: false })
    const utf16Decoder = new TextDecoder('utf-16le', { fatal: false })

    const utf8Text = utf8Decoder.decode(msgBuffer)
    const utf16Text = utf16Decoder.decode(msgBuffer)

    console.log('MSG Parser - UTF-8 text length:', utf8Text.length)
    console.log('MSG Parser - UTF-16LE text length:', utf16Text.length)

    const result = {
      from: { name: '', email: '' },
      to: [],
      cc: [],
      bcc: [],
      subject: '',
      date: new Date(), // When email was imported/uploaded
      sentDate: null,   // When email was sent (from Sent: field)
      messageId: '',
      body: '',
      rawHeaders: {},
      attachments: []
    }

    // Try to extract from both encodings and use the best match
    const extractFromText = (text, encoding) => {
      console.log(`Trying extraction with ${encoding}...`)
      const extracted = {
        subject: '',
        from: '',
        to: '',
        cc: '',
        sentDate: '',
        body: ''
      }

      // Extract subject
      const subjectMatch = text.match(/Subject[:\s]+([^\x00\r\n]{3,200})/i)
      if (subjectMatch) {
        extracted.subject = cleanString(subjectMatch[1])
        console.log(`${encoding} subject:`, extracted.subject.substring(0, 100))
      }

      // Extract from email
      const fromMatch = text.match(/From[:\s]+([^\x00\r\n]{3,200})/i)
      if (fromMatch) {
        extracted.from = cleanString(fromMatch[1])
        console.log(`${encoding} from:`, extracted.from.substring(0, 100))
      }

      // Extract to emails
      let toMatch = text.match(/To[:\s]+([^\x00\r\n]{3,200})/i)
      if (!toMatch) {
        toMatch = text.match(/To[:\s]*([^\x00]+?(?:@[^\x00;,\s]+[;,\s]?){1,5})/i)
      }
      if (toMatch) {
        extracted.to = cleanString(toMatch[1])
        console.log(`${encoding} to:`, extracted.to.substring(0, 100))
      }

      // Extract CC emails
      let ccMatch = text.match(/Cc[:\s]+([^\x00\r\n]{3,200})/i)
      if (!ccMatch) {
        ccMatch = text.match(/Cc[:\s]*([^\x00]+?(?:@[^\x00;,\s]+[;,\s]?){1,5})/i)
      }
      if (ccMatch) {
        extracted.cc = cleanString(ccMatch[1])
        console.log(`${encoding} cc:`, extracted.cc.substring(0, 100))
      }

      // Extract sent date/time (when the email was sent)
      // Try different patterns: "Sent:", or timestamp patterns
      const sentDatePatterns = [
        /Sent[:\s]+([^\x00\r\n]{10,100})/i,
        /(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}[,\s]+\d{1,2}:\d{2})/,
        /(\d{4}[\.\/\-]\d{1,2}[\.\/\-]\d{1,2}[,\s]+\d{1,2}:\d{2})/
      ]

      for (const pattern of sentDatePatterns) {
        const sentDateMatch = text.match(pattern)
        if (sentDateMatch) {
          extracted.sentDate = cleanString(sentDateMatch[1])
          console.log(`${encoding} sentDate:`, extracted.sentDate)
          break
        }
      }

      // Extract email addresses directly from the text
      const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
      const emails = text.match(emailPattern)
      if (emails && emails.length > 0) {
        const uniqueEmails = [...new Set(emails)]
        extracted.emails = uniqueEmails.slice(0, 10)
        console.log(`${encoding} found ${uniqueEmails.length} email addresses`)
      }

      // Extract body with multiple strategies
      const bodyMatch1 = text.match(/[\x00-\xFF]{0,1000}([a-zA-Z0-9\sÄÖÜäöüß.,!?;:'"()\-—–]{200,})/g)
      const bodyMatch2 = text.split(/Subject.*?\n/i).slice(1).join('\n')
      const bodyMatch3 = text.match(/([a-zA-Z0-9\sÄÖÜäöüß.,!?;:'"()\-—–\n]{100,})/g)

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
      extracted.body = bodyText
      console.log(`${encoding} body length:`, bodyText.length)

      return extracted
    }

    // Extract from both encodings
    const utf8Extracted = extractFromText(utf8Text, 'UTF-8')
    const utf16Extracted = extractFromText(utf16Text, 'UTF-16LE')

    // Use whichever extraction got more data
    const utf8Score = (utf8Extracted.subject ? 1 : 0) + (utf8Extracted.from ? 1 : 0) +
                      (utf8Extracted.to ? 1 : 0) + (utf8Extracted.cc ? 1 : 0) +
                      (utf8Extracted.sentDate ? 1 : 0) + (utf8Extracted.body.length > 50 ? 2 : 0)
    const utf16Score = (utf16Extracted.subject ? 1 : 0) + (utf16Extracted.from ? 1 : 0) +
                       (utf16Extracted.to ? 1 : 0) + (utf16Extracted.cc ? 1 : 0) +
                       (utf16Extracted.sentDate ? 1 : 0) + (utf16Extracted.body.length > 50 ? 2 : 0)

    console.log('UTF-8 score:', utf8Score, 'UTF-16LE score:', utf16Score)

    const bestExtraction = utf16Score > utf8Score ? utf16Extracted : utf8Extracted
    const bestText = utf16Score > utf8Score ? utf16Text : utf8Text

    console.log('Using', utf16Score > utf8Score ? 'UTF-16LE' : 'UTF-8', 'extraction')

    // Populate result with best extraction
    result.subject = bestExtraction.subject

    if (bestExtraction.from) {
      result.from = parseEmailAddress(bestExtraction.from)
    }

    if (bestExtraction.to) {
      result.to = parseEmailAddresses(bestExtraction.to)
    }

    // Parse CC recipients
    if (bestExtraction.cc) {
      result.cc = parseEmailAddresses(bestExtraction.cc)
    }

    // Parse sent date (when email was sent)
    if (bestExtraction.sentDate) {
      try {
        const parsedSentDate = new Date(bestExtraction.sentDate)
        if (!isNaN(parsedSentDate.getTime())) {
          result.sentDate = parsedSentDate
        }
      } catch (e) {
        console.log('Could not parse sent date:', bestExtraction.sentDate)
      }
    }

    // If still no recipients, use found email addresses
    if (result.to.length === 0 && bestExtraction.emails) {
      result.to = bestExtraction.emails.map(email => ({ name: '', email: cleanString(email) }))
    }

    // If still no recipients, extract from best text
    if (result.to.length === 0) {
      const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
      const emails = bestText.match(emailPattern)
      if (emails && emails.length > 0) {
        const uniqueEmails = [...new Set(emails)]
        result.to = uniqueEmails.slice(0, 5).map(email => ({ name: '', email: cleanString(email) }))
      }
    }

    result.body = cleanBodyText(bestExtraction.body)

    console.log('Final result:', {
      subject: result.subject,
      from: result.from,
      toCount: result.to.length,
      ccCount: result.cc.length,
      importDate: result.date,
      sentDate: result.sentDate,
      bodyLength: result.body.length
    })

    return result
  } catch (error) {
    console.error('Error parsing MSG file:', error)
    throw new Error('Failed to parse MSG file: ' + error.message)
  }
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
    .substring(0, 50000) // Limit for longer emails
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
