import deduplicate from './deduplicate.js'

function main() {
 const events = [
  {id: "a", timestamp: 0},
  {id: "b", timestamp: 100},
  {id: "a", timestamp: 400},
  {id: "a", timestamp: 1000},
  {id: "b", timestamp: 1050}
];
const windowMs = 1000;

console.log(deduplicate(events, windowMs))
    
}

main()