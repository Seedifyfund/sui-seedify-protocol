import{r as i,s as p,_ as $,j as u,c as v}from"./index-DJbGr_XK.js";const c="horizontal",x=["horizontal","vertical"],s=i.forwardRef((e,r)=>{const{decorative:o,orientation:t=c,...a}=e,n=d(t)?t:c,l=o?{role:"none"}:{"aria-orientation":n==="vertical"?n:void 0,role:"separator"};return i.createElement(p.div,$({"data-orientation":n},l,a,{ref:r}))});s.propTypes={orientation(e,r,o){const t=e[r],a=String(t);return t&&!d(t)?new Error(m(a,o)):null}};function m(e,r){return`Invalid prop \`orientation\` of value \`${e}\` supplied to \`${r}\`, expected one of:
  - horizontal
  - vertical

Defaulting to \`${c}\`.`}function d(e){return x.includes(e)}const f=s,h=i.forwardRef(({className:e,orientation:r="horizontal",decorative:o=!0,...t},a)=>u.jsx(f,{ref:a,decorative:o,orientation:r,className:v("shrink-0 bg-border",r==="horizontal"?"h-[1px] w-full":"h-full w-[1px]",e),...t}));h.displayName=f.displayName;export{h as S};
