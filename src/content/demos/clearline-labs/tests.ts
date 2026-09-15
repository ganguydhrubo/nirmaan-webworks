import {z} from 'zod';

export const tests=z.array(z.object({
  id:z.string(),
  name:z.string(),
  category:z.enum(['Blood Count','Metabolic','Hormone','Vitamin']),
  specimen:z.string(),
  preparation:z.string(),
  turnaround:z.string(),
  price:z.number().positive(),
  description:z.string(),
})).parse([
  {id:'cbc',name:'Complete Blood Count (CBC)',category:'Blood Count',specimen:'Whole blood, EDTA tube',preparation:'No fasting required — eat and drink normally beforehand.',turnaround:'6–8 hours',price:450,description:'Counts red cells, white cells and platelets to give a general picture of your blood health. One of the most commonly ordered tests.'},
  {id:'fbs',name:'Fasting Blood Sugar',category:'Metabolic',specimen:'Venous blood sample',preparation:'8–10 hours fasting; water is permitted.',turnaround:'Same day',price:120,description:'Measures glucose after a fasting period, typically used alongside other markers to understand how your body manages sugar.'},
  {id:'lipid',name:'Lipid Profile',category:'Metabolic',specimen:'Venous blood sample',preparation:'9–12 hours fasting; avoid alcohol the evening before.',turnaround:'24 hours',price:700,description:'Reports cholesterol and triglyceride levels — commonly reviewed together with a doctor as part of routine heart-health screening.'},
  {id:'thyroid',name:'Thyroid Profile (TSH, T3, T4)',category:'Hormone',specimen:'Venous blood sample',preparation:'No fasting required; an early-morning sample is usually preferred.',turnaround:'24 hours',price:650,description:'Checks thyroid hormone levels, which influence energy, weight and mood — often the starting point when thyroid symptoms are suspected.'},
  {id:'hba1c',name:'HbA1c',category:'Metabolic',specimen:'Whole blood, EDTA tube',preparation:'No fasting required.',turnaround:'24 hours',price:550,description:'Reflects average blood sugar over roughly the past three months, rather than a single-day snapshot.'},
  {id:'vitd',name:'Vitamin D (25-OH)',category:'Vitamin',specimen:'Venous blood sample',preparation:'No fasting required.',turnaround:'48 hours',price:1400,description:'Measures vitamin D stores — a common check when fatigue, bone health or immunity are being reviewed.'},
]);

export const reportFields=[
  {id:'name',label:'Test name & code',sample:'Complete Blood Count (CBC) · TST-0142',explain:'Identifies exactly which test was run, plus an internal code your provider can look up if you ever call about this report.'},
  {id:'result',label:'Your result',sample:'13.5',explain:'The measured value for this specimen. On its own, a number rarely means much — it only makes sense next to the reference range beside it.'},
  {id:'unit',label:'Unit',sample:'g/dL',explain:'The unit the result is measured in. The same test can be reported in different units by different labs, so always compare like with like.'},
  {id:'range',label:'Reference range',sample:'13.0 – 17.0',explain:'The range a lab considers typical for a healthy adult. It is a general guide, not a personal target — your own usual range can sit anywhere within it.'},
  {id:'flag',label:'Flag',sample:'Normal',explain:'A quick marker — usually Normal, High or Low — showing whether your result falls inside or outside the reference range. A flag is not a diagnosis.'},
  {id:'collected',label:'Specimen & collection',sample:'Venous blood · 15 Sep 2026, 8:42 AM',explain:'What was collected and exactly when — useful context, since some results (like fasting glucose) depend on timing.'},
  {id:'pathologist',label:'Reporting pathologist',sample:'Reviewed & authorised',explain:'Every report is reviewed and signed off by a qualified pathologist before release, not generated and sent automatically.'},
];

export const journey=[
  {n:'01',title:'Book a test.',body:'Choose a test from the directory, or bring a prescription from your doctor. Pick a home collection slot or a centre visit.'},
  {n:'02',title:'Sample is collected.',body:'A technician collects your specimen and labels it with a unique ID that follows it through the lab.'},
  {n:'03',title:'Lab processes it.',body:'Your sample is tested and the result passes through standard quality checks before it goes to a pathologist for review.'},
  {n:'04',title:'Report is ready.',body:'Your signed-off report is released to your account. Use the walkthrough below the first time you read one.'},
];
