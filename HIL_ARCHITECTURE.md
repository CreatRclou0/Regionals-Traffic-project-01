# Hardware-in-the-Loop (HIL) Architecture

The JavaScript app is a traffic simulation environment only. The Arduino is the sole traffic controller.

## Packet Protocol
TX (JS->Arduino): Nw,Na,Np,Nt,Sw,Sa,Sp,St,Ew,Ea,Ep,Et,Ww,Wa,Wp,Wt,Yd
  Yd = yellow light duration in seconds (1-10), applied to all future yellow phases
RX (Arduino->JS): NS_GREEN | NS_YELLOW | EW_GREEN | EW_YELLOW | ALL_RED

## File Map
- serialComm.js - USB Serial communication only
- trafficLights.js - Renders lights + applies Arduino commands
- gameEngine.js - Simulation pipeline + sensor summaries
- arduino/adaptive_traffic_controller.ino - Adaptive controller (all decisions)
