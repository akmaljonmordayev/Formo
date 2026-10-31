// Public offer and privacy policy (English). Numbers come from Superadmin settings.

export default function en({ rules, general }) {
  const company = general.companyName || 'Formo';
  const days = `${rules.productionDaysMin}–${rules.productionDaysMax}`;
  const payment = rules.allowCash
    ? 'from the Formo balance or in cash to the courier on delivery'
    : 'from the Formo balance';

  return {
    offer: {
      title: 'Public offer',
      intro: `This document is a public offer by the ${company} service (the Seller) to individuals (the Buyer) to make football kits with personalised printing and deliver them.`,
      sections: [
        {
          title: '1. General terms',
          items: [
            'Registering in the app and ticking “I agree to the public offer and privacy policy” means full and unconditional acceptance of this offer.',
            'This offer is governed by the Civil Code of the Republic of Uzbekistan and the Law “On the Protection of Consumer Rights”.',
            'The Seller may change these terms. A new version takes effect when published in the app and applies to orders placed afterwards.',
          ],
        },
        {
          title: '2. Subject of the agreement',
          items: [
            'The Seller makes the club kit chosen by the Buyer (a jersey and, optionally, shorts) in the chosen size, prints a name and number if requested, and delivers it to the given address.',
            'The 360° view and photos in the app are samples. Colour shades may differ slightly depending on the screen.',
          ],
        },
        {
          title: '3. Placing an order',
          items: [
            'The Buyer chooses the kit, size, print (name/number) and shorts in the app and places the order through the cart.',
            'The Buyer is responsible for the correct name, number and size. Once confirmed, they are produced exactly as entered.',
            `Name — up to ${rules.printNameMaxLength} characters, number — from ${rules.printNumberMin} to ${rules.printNumberMax}.`,
            'Offensive or political text, or text that infringes third-party rights, is not printed — the Seller may cancel such an order.',
          ],
        },
        {
          title: '4. Price and payment',
          items: [
            'The price is fixed when the order is placed and consists of the kit, shorts, print and delivery prices minus any promo code discount.',
            `Payment is made ${payment}.`,
            'The balance is topped up through the Formo Telegram bot: the Buyer transfers money to the given card and sends the receipt; after an administrator checks it, the amount is added to the balance.',
          ],
        },
        {
          title: '5. Production and delivery',
          items: [
            `Once the workshop accepts an order, it is usually made in ${days} working days. The time may vary with workload — the current status is shown in “My orders”.`,
            'Order stages: Accepted → Preparing → On the way → Delivered.',
            'Delivery is made to the address and time slot chosen by the Buyer. A wrong address or an unreachable Buyer may delay delivery.',
          ],
        },
        {
          title: '6. Cancelling an order',
          items: [
            'The Buyer can cancel an order in the app until the workshop accepts it (status “Accepted” or “Sent to workshop”).',
            'After the workshop accepts the order, the kit is made individually for the Buyer, so it can no longer be cancelled. This applies to both cash and balance payments.',
            'For a cancelled order, the amount paid from the balance is fully returned to the Formo balance.',
            'If a Buyer repeatedly refuses to accept finished cash-on-delivery orders without reason, the Seller may restrict cash payment for that Buyer.',
          ],
        },
        {
          title: '7. Returns and exchanges',
          items: [
            'A kit printed with a name/number is a personalised item and, if of proper quality, cannot be returned or exchanged because of a change of mind.',
            `If there is a defect (print error, size or kit not matching the order, damage), the Buyer contacts the Seller with a photo using the contacts below within ${rules.returnDays} days of receipt.`,
            'If the defect is confirmed, the Seller remakes the kit at its own cost or refunds the amount paid.',
          ],
        },
        {
          title: '8. Liability',
          items: [
            'The Seller is responsible for fulfilling the order on time and with proper quality.',
            'The Seller is not liable for the consequences of incorrect data entered by the Buyer (name, number, size, address, phone).',
            'In force majeure (natural disasters, communication outages, government decisions), deadlines are extended for the duration of those circumstances.',
          ],
        },
        {
          title: '9. Disputes',
          items: [
            'Disputes are first settled by negotiation. The Buyer receives a reply within 10 working days.',
            'If no agreement is reached, the dispute is heard in court under the laws of the Republic of Uzbekistan.',
          ],
        },
      ],
    },

    privacy: {
      title: 'Privacy policy',
      intro: `${company} protects the Buyer’s personal data in line with the Law “On Personal Data”. This policy explains what data is collected and why.`,
      sections: [
        {
          title: '1. What we collect',
          items: [
            'Phone number and Telegram ID — to sign in (the code is sent by the Telegram bot) and for order notifications.',
            'Name, gender, age, height and weight — to suggest the right size and process the order.',
            'Delivery addresses and the map point. Location access is used only while you pick an address on the map and is never tracked in the background.',
            'Order history, balance transactions and payment receipt photos.',
          ],
        },
        {
          title: '2. How we use it',
          items: [
            'To make and deliver orders and notify you about their status.',
            'To check balance top-up requests and keep your account secure.',
            'To improve the service. Data is not sold or shared with third parties for advertising.',
          ],
        },
        {
          title: '3. Who receives it',
          items: [
            'The workshop — only the order contents (kit, size, print text).',
            'The courier — name, phone number and delivery address.',
            'Government bodies — only where the law requires it.',
          ],
        },
        {
          title: '4. Storage and security',
          items: [
            'Data is kept on protected servers, and only authorised staff can access it.',
            'Sign-in uses only a one-time code from the Telegram bot — no passwords are stored.',
            'Data is kept while the account is active and for the periods required by law.',
          ],
        },
        {
          title: '5. Your rights',
          items: [
            'View and change your profile data in the app at any time.',
            'Ask for your account and personal data to be deleted using the contacts below. Data the law requires us to keep (such as payment records) is kept for the required period.',
            'Turn off Telegram bot messages by stopping the bot.',
          ],
        },
      ],
    },

    extraTitle: 'Additional terms',
    contactsTitle: 'Contacts',
  };
}
