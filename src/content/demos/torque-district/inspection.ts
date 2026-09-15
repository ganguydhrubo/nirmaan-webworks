import {z} from 'zod';
export const inspection=z.array(z.object({id:z.string(),number:z.string(),title:z.string(),description:z.string(),checks:z.array(z.string()).min(3)})).parse([
{id:'body',number:'01',title:'Look beneath the finish.',description:'A beautiful silhouette deserves a clear condition record. Start with the details you can see and the history you can verify.',checks:['Panel alignment and paint condition','Glass, lighting and wheel condition','Recorded repairs and supporting documentation']},
{id:'mechanical',number:'02',title:'Know what moves you.',description:'A mechanical review should explain what was inspected, what was observed and what needs attention before a purchase.',checks:['Cold start and diagnostic scan','Fluids, brakes and suspension review','Service records and road-test observations']},
{id:'cabin',number:'03',title:'Every detail, within reach.',description:'The things you use every day matter. Work through cabin functions and finish with a clear list of included equipment.',checks:['Controls, displays and air conditioning','Seat adjustment and interior wear','Keys, tools and listed accessories']},
]);
export const services=z.array(z.object({id:z.string(),title:z.string(),price:z.number().positive(),scope:z.string()})).parse([
{id:'inspection',title:'Pre-purchase inspection',price:3500,scope:'Visual, diagnostic and road-test observations; written findings. No dismantling.'},
{id:'diagnostics',title:'Diagnostic assessment',price:1800,scope:'Fault-code scan and initial assessment. Repairs and parts quoted separately.'},
{id:'detail',title:'Interior refresh',price:2400,scope:'Vacuum, surface cleaning and glass. Upholstery repair and deep stain treatment excluded.'},
]);
