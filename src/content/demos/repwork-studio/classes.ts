import { z } from 'zod';
export const classes = z.array(z.object({id:z.string(),day:z.enum(['Mon','Tue','Wed','Thu','Fri','Sat']),time:z.string(),name:z.string(),format:z.enum(['Strength','Conditioning','Mobility']),minutes:z.number().positive(),level:z.string()})).parse([
{id:'mon-strength',day:'Mon',time:'06:30',name:'Build / full body',format:'Strength',minutes:50,level:'All levels'},
{id:'mon-engine',day:'Mon',time:'18:30',name:'Engine / intervals',format:'Conditioning',minutes:45,level:'Scalable intensity'},
{id:'tue-reset',day:'Tue',time:'07:00',name:'Reset / move better',format:'Mobility',minutes:40,level:'All levels'},
{id:'wed-strength',day:'Wed',time:'06:30',name:'Build / lower body',format:'Strength',minutes:50,level:'All levels'},
{id:'thu-engine',day:'Thu',time:'18:30',name:'Engine / team circuit',format:'Conditioning',minutes:45,level:'Scalable intensity'},
{id:'fri-strength',day:'Fri',time:'07:00',name:'Build / upper body',format:'Strength',minutes:50,level:'All levels'},
{id:'sat-reset',day:'Sat',time:'09:00',name:'Reset / weekend flow',format:'Mobility',minutes:40,level:'All levels'},
{id:'sat-strength',day:'Sat',time:'10:00',name:'Build / foundations',format:'Strength',minutes:50,level:'First visit friendly'},
]);
