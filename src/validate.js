import { loadAndValidateIdeas } from './library.js';

const ideas = await loadAndValidateIdeas();
console.log(`Validated ${ideas.length} musical idea${ideas.length === 1 ? '' : 's'}.`);
