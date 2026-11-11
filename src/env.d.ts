declare module "virtual:rimelight-ui" {
  export const config: import("@rimelight/ui/types").UIConfig;
}
interface Window {
  confetti?: (options: {particleCount:number;spread:number;origin:{y:number};colors:string[];disableForReducedMotion:boolean}) => void;
}
