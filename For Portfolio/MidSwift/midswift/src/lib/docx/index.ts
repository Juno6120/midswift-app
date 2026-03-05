/* I'm using this index.ts file as a "barrel" to neatly package and expose all 
  of my Word document generator functions from one central location. 

  By setting it up this way, when I need to use these functions elsewhere in 
  the application, I can just import them from this folder's root rather than 
  writing out a bunch of messy, individual file paths.
  
  I'm also being intentional here by selectively exporting *only* the specific 
  generator functions. This acts as a safety net so I don't accidentally leak 
  or expose any internal helper types or variables that belong strictly to 
  those individual files.
*/

export { exportBCGToWord } from "./generateBCG";
export { exportTeenagePregnancyToWord } from "./generateTeenage";
export { exportDewormingToWord } from "./generateDeworming";
export { exportNatalityToWord } from "./generateNatality";
export { exportGeneralToWord } from "./generateGeneral";
