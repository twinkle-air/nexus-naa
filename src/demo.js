// Deterministic algorithm fixture, not an experimental measurement.
export function syntheticDemo(){const channels=Array.from({length:1600},(_,i)=>i);return 'channel,counts\n'+channels.map(i=>`${i},${Math.round(5+1000*Math.exp(-.5*((i-1173.228)/3)**2)+1000*Math.exp(-.5*((i-1332.492)/3)**2))}`).join('\n');}
