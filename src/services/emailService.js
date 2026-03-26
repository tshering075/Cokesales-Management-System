/**
 * Email Service for sending order approval emails
 * Supports EmailJS (client-side email service) and mailto fallback
 */

/**
 * Send order approval email via EmailJS
 * Requires EmailJS account and service configuration
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email addresses (comma-separated)
 * @param {string} options.subject - Email subject
 * @param {string} options.htmlBody - HTML email body
 * @param {string} options.imageData - Base64 encoded PNG image data
 * @param {string} options.orderId - Order ID for tracking
 * @returns {Promise<void>}
 */
export async function sendOrderEmail({ to, cc, subject, htmlBody, imageData, orderId }) {
  // Check if EmailJS is configured
  const emailjsServiceId = localStorage.getItem('emailjs_service_id');
  const emailjsTemplateId = localStorage.getItem('emailjs_template_id');
  const emailjsPublicKey = localStorage.getItem('emailjs_public_key');

  if (emailjsServiceId && emailjsTemplateId && emailjsPublicKey) {
    try {
      // Dynamically import EmailJS (optional dependency)
      const emailjs = await import('@emailjs/browser').catch(() => null);
      
      if (!emailjs) {
        console.warn('EmailJS not installed. Install with: npm install @emailjs/browser');
        throw new Error('EmailJS not available');
      }

      emailjs.default.init(emailjsPublicKey);

      // Get sender email
      const senderEmail = getSenderEmail();

      // EmailJS template variables
      const templateParams = {
        to_email: to,
        cc_email: cc || '',
        from_email: senderEmail || 'noreply@company.com',
        from_name: 'Order Management System',
        subject: subject,
        message: htmlBody,
        order_id: orderId || '',
        // For attachments, you'd need to use EmailJS attachment API
        // or include image as base64 in body
        image_data: imageData || ''
      };

      await emailjs.default.send(
        emailjsServiceId,
        emailjsTemplateId,
        templateParams
      );

      console.log('✅ Email sent successfully via EmailJS');
      return { success: true, method: 'emailjs' };
    } catch (error) {
      console.error('EmailJS error:', error);
      throw error;
    }
  } else {
    // Fallback to mailto link with data URI
    throw new Error('EmailJS not configured. Use mailto fallback or configure EmailJS.');
  }
}

/**
 * Create mailto link with order details
 * Note: Browser mailto doesn't support attachments directly
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email addresses
 * @param {string} options.subject - Email subject
 * @param {string} options.body - Plain text email body
 * @returns {string} mailto URL
 */
export function createMailtoLink({ to, cc, subject, body }) {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  let mailtoLink = `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
  if (cc && cc.trim()) {
    mailtoLink += `&cc=${encodeURIComponent(cc)}`;
  }
  return mailtoLink;
}

/**
 * Convert order data to HTML table matching Coke Calculator format
 * @param {Object} order - Order object
 * @returns {string} HTML string
 */
export function orderToHTML(order) {
  const orderDate = new Date(order.timestamp || Date.now()).toLocaleDateString();
  const orderNumber = order.orderId || order.orderNumber || 'N/A';
  const distributorName = order.distributorName || order.distributorCode || 'N/A';
  
  // Calculate totals
  let totalCasesSum = 0;
  let totalAmountSum = 0;
  let totalTonSum = 0;
  let totalUC_CSD = 0;
  let totalUC_Water = 0;
  
  let itemsHTML = '';
  if (order.data && Array.isArray(order.data)) {
    itemsHTML = order.data.map((item, index) => {
      const sku = item.sku || item.name || item.product || 'N/A';
      const cases = item.cases || 0;
      const rate = item.rate || 0;
      const totalAmount = item.totalAmount || (cases * rate);
      const totalTon = item.totalTon || 0;
      const totalUC = item.totalUC || 0;
      const category = item.category || 'CSD';
      const freeCases = item.freeCases || 0;
      const discountAmount = item.discountAmount || 0;
      const schemeApplied = item.schemeApplied;
      
      // Calculate purchased cases (total cases - free cases)
      const purchasedCases = cases - freeCases;
      
      // Accumulate totals (use purchased cases for totalCasesSum, but include free in display)
      totalCasesSum += cases; // Include free cases in total
      totalAmountSum += totalAmount;
      totalTonSum += totalTon;
      if (category === 'CSD') {
        totalUC_CSD += totalUC;
      } else if (category === 'Water') {
        totalUC_Water += totalUC;
      }
      
      // Alternate row colors like calculator
      const rowBg = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
      
      // Determine if discount is applied
      const isDiscountApplied = schemeApplied && schemeApplied.type === 'discount' && discountAmount > 0;
      const discountedRate = isDiscountApplied ? (rate - (discountAmount / (purchasedCases || cases))) : rate;
      
      return `
        <tr style="background-color: ${rowBg};">
          <td style="font-weight: bold; padding: 8px; font-size: 12px; color: #212121;">${sku}</td>
          <td style="font-weight: bold; padding: 8px; font-size: 12px; text-align: right;">
            ${freeCases > 0 ? `
              <div style="display: flex; flex-direction: column; align-items: flex-end;">
                <span style="color: #212121;">${purchasedCases.toLocaleString()}</span>
                <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                  <span style="color: #2e7d32; font-size: 10px; font-weight: bold;">+${freeCases}</span>
                  <span style="background-color: #4caf50; color: white; padding: 2px 6px; border-radius: 3px; font-size: 8px; font-weight: bold;">FREE</span>
                </div>
              </div>
            ` : `<span style="color: #212121;">${cases.toLocaleString()}</span>`}
          </td>
          <td style="font-weight: bold; padding: 8px; font-size: 12px; text-align: right;">
            ${isDiscountApplied ? `
              <div style="display: flex; flex-direction: column; align-items: flex-end;">
                <span style="color: #1976d2; font-weight: bold;">${discountedRate.toFixed(2)}</span>
                <span style="background-color: #1976d2; color: white; padding: 2px 6px; border-radius: 3px; font-size: 8px; font-weight: bold; margin-top: 2px;">DISCOUNTED</span>
              </div>
            ` : `<span style="color: #212121;">${rate.toLocaleString()}</span>`}
          </td>
          <td style="font-weight: bold; padding: 8px; font-size: 12px; text-align: right; color: #212121;">${totalAmount.toLocaleString()}</td>
          <td style="font-weight: bold; padding: 8px; font-size: 12px; text-align: right; color: #212121;">${totalTon.toFixed(3)}</td>
          <td style="font-weight: bold; padding: 8px; font-size: 12px; text-align: right; color: #212121;">${totalUC !== null && totalUC !== undefined ? totalUC.toFixed(2) : '-'}</td>
        </tr>
      `;
    }).join('');
  }
  
  // Use provided totals if available, otherwise use calculated
  const finalTotalCases = order.totalCases || totalCasesSum;
  const finalTotalAmount = order.totalAmount || totalAmountSum;
  const finalTotalTon = order.totalTon || totalTonSum;
  const finalCSD_UC = order.csdUC || totalUC_CSD;
  const finalWater_UC = order.waterUC || totalUC_Water;
  
  // Calculate GST (5% on total amount after discount)
  // GST is not applicable for "Gelephu Grocery" distributor
  const isGelephuGrocery = distributorName && distributorName.toLowerCase().includes("gelephu grocery");
  const gstRate = isGelephuGrocery ? 0 : 0.05; // 5% or 0% for Gelephu Grocery
  const grossTotal = finalTotalAmount; // Amount after discount
  const gstAmount = grossTotal * gstRate;
  const netTotal = grossTotal + gstAmount;

  return `
    <html>
      <head>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #fff;
          }
          .order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background-color: #fffde7;
            border-bottom: 2px solid #fbc02d;
            font-weight: bold;
            font-size: 14px;
          }
          .order-header-left {
            color: #000;
          }
          .order-header-center {
            text-align: center;
            flex-grow: 1;
            font-size: 16px;
            font-weight: bold;
            color: #e53935;
          }
          .order-header-right {
            color: #000;
            font-size: 12px;
          }
          .table-container {
            background-color: #fffde7;
            border-radius: 8px;
            border: 2px solid #fbc02d;
            box-shadow: 0 3px 6px rgba(0,0,0,0.1);
            overflow: hidden;
            margin: 20px 0;
          }
          table { 
            border-collapse: collapse; 
            width: 100%; 
            background-color: #fffde7;
          }
          th { 
            background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
            color: #ffffff;
            font-weight: bold;
            padding: 10px 8px;
            text-align: left;
            font-size: 13px;
            border: 1px solid #e53935;
            letter-spacing: 0.5px;
          }
          th:nth-child(2),
          th:nth-child(3),
          th:nth-child(4),
          th:nth-child(5),
          th:nth-child(6) {
            text-align: right;
          }
          td { 
            padding: 8px;
            border: 1px solid #fbc02d;
          }
          .total-row {
            background-color: #ffe082;
            font-weight: bold;
          }
          .uc-row {
            background-color: #ffe082;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="table-container">
          <div class="order-header">
            <div class="order-header-left">${distributorName}</div>
            <div class="order-header-center">Order No: ${orderNumber}</div>
            <div class="order-header-right">📅 ${orderDate}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Qty/Cases</th>
                <th>Rate</th>
                <th>Total Amount</th>
                <th>Total Tons</th>
                <th>Total UC</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML || '<tr><td colspan="6" style="text-align: center; padding: 20px;">No items</td></tr>'}
              
              <tr class="total-row">
                <td style="font-weight: bold; padding: 8px;">Gross Total</td>
                <td style="font-weight: bold; padding: 8px;">${finalTotalCases}</td>
                <td style="font-weight: bold; padding: 8px;">-</td>
                <td style="font-weight: bold; padding: 8px; color: #d32f2f;">${finalTotalAmount}</td>
                <td style="font-weight: bold; padding: 8px;">${finalTotalTon.toFixed(3)}</td>
                <td style="font-weight: bold; padding: 8px;">-</td>
              </tr>
              ${!isGelephuGrocery && gstAmount > 0 ? `
              <tr style="background-color: #fff8e1; font-weight: bold;">
                <td colspan="3" style="padding: 8px; text-align: right; color: #f57c00;">GST (5%):</td>
                <td style="padding: 8px; text-align: right;">${gstAmount.toFixed(2)}</td>
                <td colspan="2" style="padding: 8px;">-</td>
              </tr>
              ` : ''}
              <tr style="background-color: #c8e6c9; font-weight: bold; border-top: 3px solid #4caf50;">
                <td colspan="3" style="padding: 8px; text-align: right; color: #1b5e20;">Net Total:</td>
                <td style="padding: 8px; text-align: right; color: #2e7d32;">${netTotal.toFixed(2)}</td>
                <td colspan="2" style="padding: 8px;">-</td>
              </tr>
              
              <tr class="uc-row">
                <td colspan="5" style="font-weight: bold; padding: 8px; text-align: left;">CSD UC:</td>
                <td style="font-weight: bold; padding: 8px; text-align: right;">${finalCSD_UC.toFixed(2)}</td>
              </tr>
              
              <tr class="uc-row">
                <td colspan="5" style="font-weight: bold; padding: 8px; text-align: left;">Water UC:</td>
                <td style="font-weight: bold; padding: 8px; text-align: right;">${finalWater_UC.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          Please review and approve this order.
        </p>
      </body>
    </html>
  `;
}

/**
 * Get email recipient addresses from localStorage
 * @returns {Array} Array of recipient email addresses
 */
export function getRecipientEmails() {
  try {
    const stored = localStorage.getItem('order_approval_recipients');
    if (stored) {
      const data = JSON.parse(stored);
      // Support both old format (groups) and new format (simple array)
      if (Array.isArray(data)) {
        // Check if it's old format (array of groups) or new format (array of emails)
        if (data.length > 0 && data[0] && typeof data[0] === 'object' && data[0].emails) {
          // Old format: extract all emails from groups
          const allEmails = new Set();
          data.forEach(group => {
            if (group.emails && Array.isArray(group.emails)) {
              group.emails.forEach(email => allEmails.add(email.trim()));
            }
          });
          return Array.from(allEmails);
        }
        // New format: simple array of emails
        return data.filter(email => email && typeof email === 'string');
      }
    }
    return [];
  } catch (e) {
    return [];
  }
}

/**
 * Save email recipient addresses to localStorage
 * @param {Array} emails - Array of recipient email addresses
 */
export function saveRecipientEmails(emails) {
  localStorage.setItem('order_approval_recipients', JSON.stringify(emails));
}

/**
 * Get email recipient groups from localStorage (deprecated - for backward compatibility)
 * @returns {Array} Array of recipient groups
 * @deprecated Use getRecipientEmails() instead
 */
export function getRecipientGroups() {
  // For backward compatibility, convert to groups format
  const emails = getRecipientEmails();
  return emails.length > 0 ? [{ name: 'All Recipients', emails: emails }] : [];
}

/**
 * Save email recipient groups to localStorage (deprecated - for backward compatibility)
 * @param {Array} groups - Array of recipient groups
 * @deprecated Use saveRecipientEmails() instead
 */
export function saveRecipientGroups(groups) {
  // Extract all emails from groups and save as simple array
  const allEmails = new Set();
  groups.forEach(group => {
    if (group.emails && Array.isArray(group.emails)) {
      group.emails.forEach(email => allEmails.add(email.trim()));
    }
  });
  saveRecipientEmails(Array.from(allEmails));
}

/**
 * Get default recipient emails (all recipients)
 * @returns {string} Comma-separated email addresses
 */
export function getDefaultRecipients() {
  const emails = getRecipientEmails();
  return emails.join(', ');
}

/**
 * Get sender email address from Supabase Auth current user
 * @returns {Promise<string>} Sender email address (logged-in admin's email)
 */
export async function getSenderEmail() {
  try {
    // Try to get from Supabase Auth
    if (typeof window !== 'undefined') {
      // Dynamic import to avoid circular dependencies
      const { getCurrentUser } = await import('./supabaseService');
      const currentUser = await getCurrentUser();
      if (currentUser && currentUser.email) {
        // Also save to localStorage as backup
        localStorage.setItem('admin_email', currentUser.email);
        return currentUser.email;
      }
    }
    // Fallback: try to get from localStorage (for non-Supabase mode or when auth not ready)
    return localStorage.getItem('admin_email') || '';
  } catch (e) {
    // Fallback if Supabase not available
    try {
      return localStorage.getItem('admin_email') || '';
    } catch {
      return '';
    }
  }
}