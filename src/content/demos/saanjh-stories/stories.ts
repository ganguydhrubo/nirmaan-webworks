import { z } from 'zod';
export const stories=z.array(z.object({id:z.string(),chapter:z.string(),title:z.string(),caption:z.string(),image:z.enum(['celebration','portrait','detail']),text:z.string()})).parse([
{id:'the-colour',chapter:'01 / The colour',title:'Joy, in full colour.',caption:'A haldi celebration · Illustrative photograph by Keyur Mali',image:'celebration',text:'The room changes before the ceremony begins. Someone laughs, petals fill the air, and the day becomes something you can feel.'},
{id:'the-pause',chapter:'02 / The pause',title:'A world of your own.',caption:'A wedding portrait · Illustrative photograph by Krishna Videotech',image:'portrait',text:'Among all the people and all the plans, there are small moments that belong only to two people. Leave a little room for them.'},
{id:'the-details',chapter:'03 / The details',title:'The smallest things stay.',caption:'Henna and hands · Illustrative photograph by Faheem Ahamad',image:'detail',text:'Hands finding each other. A careful stitch. A familiar gesture. The details bring you back to the feeling of a day.'},
]);
