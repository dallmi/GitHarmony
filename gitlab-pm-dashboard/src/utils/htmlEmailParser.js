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
      date: new Date(),
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
    const headerPatterns = [
      { pattern: /From:\s*([^\n<]+)/i, field: 'from' },
      { pattern: /To:\s*([^\n<]+)/i, field: 'to' },
      { pattern: /Subject:\s*([^\n<]+)/i, field: 'subject' },
      { pattern: /Date:\s*([^\n<]+)/i, field: 'date' }
    ]

    const plainText = doc.body ? doc.body.textContent : htmlContent

    headerPatterns.forEach(({ pattern, field }) => {
      const match = plainText.match(pattern)
      if (match) {
        if (field === 'from') {
          result.from = parseEmailAddress(match[1])
        } else if (field === 'to') {
          result.to = parseEmailAddresses(match[1])
        } else if (field === 'subject' && !result.subject) {
          result.subject = match[1].trim()
        } else if (field === 'date') {
          try {
            result.date = new Date(match[1].trim())
            if (isNaN(result.date.getTime())) {
              result.date = new Date()
            }
          } catch (e) {
            result.date = new Date()
          }
        }
      }
    })

    // Extract body content
    const bodyElement = doc.querySelector('body') || doc.querySelector('.EmailBody') || doc.querySelector('#bodyContent')

    if (bodyElement) {
      // Remove script and style tags
      const scripts = bodyElement.querySelectorAll('script, style')
      scripts.forEach(el => el.remove())

      // Get text content
      result.body = bodyElement.textContent
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 50000)
    } else {
      // Fallback: strip all HTML tags
      result.body = plainText
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 50000)
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
