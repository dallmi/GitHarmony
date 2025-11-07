/**
 * HTML Email Parser
 * Parse HTML email files exported from Outlook
 */

/**
 * Parse HTML email file
 * @param {string} htmlContent - HTML email content as string
 * @returns {Object} Parsed email data
 */
export function parseHtmlEmail(htmlContent) {
  try {
    // Create a temporary DOM element to parse HTML
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlContent, 'text/html')

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

    // Try to extract from meta tags or divs (Outlook HTML format)
    const extractFromElement = (selector) => {
      const el = doc.querySelector(selector)
      return el ? el.textContent.trim() : ''
    }

    // Extract subject from title or specific divs
    result.subject = doc.title || extractFromElement('[name="Subject"]') || extractFromElement('div.Subject')

    // Try to find email headers in the HTML
    // Extended patterns to capture multi-line recipients (especially CC)
    const headerPatterns = [
      { pattern: /From:\s*([^\n<]+)/i, field: 'from' },
      { pattern: /To:\s*([^\n]+?)(?:\s*(?:Cc|Subject|Sent):)/i, field: 'to' },
      { pattern: /Cc:\s*([^\n]+?)(?:\s*(?:Subject|Sent):)/i, field: 'cc' },
      { pattern: /Subject:\s*([^\n<]+)/i, field: 'subject' },
      { pattern: /Sent:\s*([^\n<]+)/i, field: 'sent' }
    ]

    const plainText = doc.body ? doc.body.textContent : htmlContent

    headerPatterns.forEach(({ pattern, field }) => {
      const match = plainText.match(pattern)
      if (match) {
        if (field === 'from') {
          result.from = parseEmailAddress(match[1])
        } else if (field === 'to') {
          result.to = parseEmailAddresses(match[1])
        } else if (field === 'cc') {
          result.cc = parseEmailAddresses(match[1])
        } else if (field === 'subject' && !result.subject) {
          result.subject = match[1].trim()
        } else if (field === 'sent') {
          // Extract sent date (when email was sent)
          try {
            const parsedSentDate = new Date(match[1].trim())
            if (!isNaN(parsedSentDate.getTime())) {
              result.sentDate = parsedSentDate
            }
          } catch (e) {
            // Keep sentDate as null if parsing fails
          }
        }
      }
    })

    // Fallback patterns for To and CC if the above didn't capture everything
    if (result.to.length === 0) {
      const toMatch = plainText.match(/To:\s*([^]+?)(?:\r?\n\s*(?:Cc|Subject|Sent):|$)/i)
      if (toMatch) {
        result.to = parseEmailAddresses(toMatch[1])
      }
    }

    if (result.cc.length === 0) {
      const ccMatch = plainText.match(/Cc:\s*([^]+?)(?:\r?\n\s*(?:Subject|Sent):|$)/i)
      if (ccMatch) {
        result.cc = parseEmailAddresses(ccMatch[1])
      }
    }

    // Extract body content
    const bodyElement = doc.querySelector('body') || doc.querySelector('.EmailBody') || doc.querySelector('#bodyContent')

    if (bodyElement) {
      // Remove script and style tags
      const scripts = bodyElement.querySelectorAll('script, style')
      scripts.forEach(el => el.remove())

      // Get text content
      let bodyText = bodyElement.textContent
        .replace(/\s+/g, ' ')
        .trim()

      // Remove email headers from body (From:, To:, Cc:, Subject:, Sent:)
      // These headers often appear at the start of the body in HTML exports
      bodyText = bodyText.replace(/^[\s\S]*?(From:\s*[^\n]+\s+Sent:\s*[^\n]+\s+To:\s*[^\n]+(\s+Cc:\s*[^\n]+)?\s+Subject:\s*[^\n]+\s+)/i, '')
      bodyText = bodyText.replace(/^[\s\S]*?(From:\s*[^\n]+\s+To:\s*[^\n]+(\s+Cc:\s*[^\n]+)?\s+Sent:\s*[^\n]+\s+Subject:\s*[^\n]+\s+)/i, '')

      // Alternative pattern: headers might be in different order
      bodyText = bodyText.replace(/^(From|To|Cc|Subject|Sent|Date):\s*[^\n]+\s*/gim, '')

      result.body = bodyText.trim()
    } else {
      // Fallback: strip all HTML tags
      let bodyText = plainText
        .replace(/\s+/g, ' ')
        .trim()

      // Remove headers from fallback as well
      bodyText = bodyText.replace(/^[\s\S]*?(From:\s*[^\n]+\s+Sent:\s*[^\n]+\s+To:\s*[^\n]+(\s+Cc:\s*[^\n]+)?\s+Subject:\s*[^\n]+\s+)/i, '')
      bodyText = bodyText.replace(/^(From|To|Cc|Subject|Sent|Date):\s*[^\n]+\s*/gim, '')

      result.body = bodyText.trim()
    }

    // If we didn't find any headers, try to extract emails from the entire content
    if (result.to.length === 0) {
      const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
      const emails = htmlContent.match(emailPattern)
      if (emails && emails.length > 0) {
        const uniqueEmails = [...new Set(emails)].filter(e => !e.includes('w3.org') && !e.includes('schemas'))
        result.to = uniqueEmails.slice(0, 5).map(email => ({ name: '', email: email.trim() }))
      }
    }

    return result
  } catch (error) {
    console.error('Error parsing HTML email:', error)
    throw new Error('Failed to parse HTML email: ' + error.message)
  }
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
