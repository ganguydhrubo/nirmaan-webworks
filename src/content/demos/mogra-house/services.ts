export interface Service {id:string; name:string; category:string; price:number; minutes:number; description:string;}
export const services:Service[] = [
  {id:'cut',name:'The considered cut',category:'Hair',price:1200,minutes:60,description:'A conversation about your routine, followed by a wash, cut and easy finish. All hair lengths welcome.'},
  {id:'blowdry',name:'A good-hair afternoon',category:'Hair',price:900,minutes:45,description:'Wash and blow-dry, with a smooth or softly waved finish. Sample price for shoulder-length hair.'},
  {id:'hair-mask',name:'The moisture moment',category:'Hair',price:1500,minutes:45,description:'A conditioning mask, gentle scalp massage and simple dry. A little extra time for hair that feels dry.'},
  {id:'roots',name:'Root refresh',category:'Colour',price:2200,minutes:90,description:'Single-tone root application, rinse and simple dry. Sample price covers up to 2 cm of regrowth.'},
  {id:'gloss',name:'Soft-focus gloss',category:'Colour',price:2500,minutes:75,description:'A tonal gloss for an existing colour direction, with a consultation and finish. Final shade is discussed first.'},
  {id:'balayage',name:'Sunlit dimension',category:'Colour',price:6500,minutes:210,description:'An illustrative balayage session with placement planning, colour, toner and finish. Length and starting colour affect the quote.'},
  {id:'facial',name:'The slow facial',category:'Skin',price:2400,minutes:60,description:'A gentle cleanse, massage, mask and moisturiser. A cosmetic ritual with product choices discussed before starting.'},
  {id:'express',name:'A small reset',category:'Skin',price:1400,minutes:30,description:'A shorter cleanse, mask and moisturiser ritual for a visit between other plans.'},
  {id:'body',name:'The quiet hour',category:'Body',price:3000,minutes:60,description:'A relaxation massage with your preferred pressure, comfortable draping and a quiet finish. No therapeutic outcome is promised.'},
  {id:'feet',name:'Feet off the floor',category:'Body',price:1600,minutes:40,description:'A warm soak and gentle lower-leg and foot massage. An unhurried pause after a busy week.'},
  {id:'manicure',name:'Hands, beautifully simple',category:'Nails',price:1000,minutes:45,description:'Shape, gentle cuticle care and classic polish. Nail art and extensions are outside this sample service.'},
  {id:'pedicure',name:'The weekend pedicure',category:'Nails',price:1500,minutes:60,description:'Soak, shape, gentle buff, moisturiser and classic polish. Bring open footwear if choosing polish.'},
];
export const categories=['Hair','Colour','Skin','Body','Nails'];
export interface Ritual {slug:string; name:string; line:string; intro:string; serviceIds:string[]; colour:string; sequence:string[];}
export const rituals:Ritual[]=[
 {slug:'the-sunday-state',name:'The Sunday State',line:'Leave a little lighter.',intro:'For the afternoon you have finally kept for yourself. A quiet hour for the body, a slower facial and no need to hurry between them.',serviceIds:['body','facial'],colour:'#d5c4e6',sequence:['Settle in and share your comfort preferences.','Ease into The quiet hour, with pressure discussed first.','Pause for water before The slow facial.','Leave ten extra minutes to find your pace again.']},
 {slug:'ready-when-you-are',name:'Ready When You Are',line:'Your occasion. Your kind of polish.',intro:'A celebration, a dinner or simply a good excuse. Softly finished hair and classic nails, with enough time to enjoy getting ready.',serviceIds:['blowdry','manicure'],colour:'#f2edb8',sequence:['Bring a reference for your preferred hair finish.','Choose a classic polish shade before the manicure.','Enjoy a wash and blow-dry with smooth or soft-wave styling.','Allow extra drying time for polish before you head out.']},
 {slug:'a-fresh-page',name:'A Fresh Page',line:'A little change goes a long way.',intro:'For a new season or an ordinary Tuesday. A considered haircut and a foot ritual turn a practical appointment into a small occasion.',serviceIds:['cut','feet'],colour:'#ebc4ad',sequence:['Talk through your hair routine and preferred length.','Choose a cut that works with the way you style at home.','Put your feet up for a warm soak and gentle massage.','Finish with simple styling notes to take away.']},
];
export const selectedServices=(ids:string[])=>services.filter(s=>ids.includes(s.id));
export const inr=(n:number)=>`₹${n.toLocaleString('en-IN')}`;
export const enquiry='/contact?category=Salon%20%26%20Spa&demo=mogra-house';
