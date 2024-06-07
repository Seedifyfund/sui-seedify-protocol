import{r as s,j as V,c as T}from"./index-iN8fCw0q.js";const k=s.createContext(!1),j=s.forwardRef(({className:o,children:i,...w},E)=>{const{defaultValue:l,value:g,onChange:c,onComplete:p,onIncomplete:m,placeholder:I="○",type:C="alphanumeric",name:A,form:N,otp:d=!1,mask:b=!1,disabled:v=!1,readOnly:P=!1,autoFocus:D=!1,ariaLabel:x="",...F}=w,K=L(i),h=M(i),{pins:t,pinValue:e,refMap:r,...n}=G({value:g,defaultValue:l,placeholder:I,type:C,length:h,readOnly:P});s.useEffect(()=>{c&&c(e)},[c,e]),s.useEffect(()=>{p&&e.length===h&&p(e),m&&e.length!==h&&m(e)},[h,p,m,e]),s.useEffect(()=>{if(!D)return;const R=r==null?void 0:r.get(0);R&&R.focus()},[D,r]);const a=s.useRef(0);let y=0;const _=K.map(R=>{if(R.type===B){const f=y;return y=y+1,s.cloneElement(R,{name:A,inputKey:`input-${f}`,value:h>f?t[f]:"",onChange:u=>n.handleChange(u,f),onFocus:u=>n.handleFocus(u,f),onBlur:()=>n.handleBlur(f),onKeyDown:u=>n.handleKeyDown(u,f),onPaste:u=>n.handlePaste(u),placeholder:I,type:C,mask:b,autoComplete:d?"one-time-code":"off",disabled:v,readOnly:P,"aria-label":x,ref:u=>{u?r==null||r.set(f,u):r==null||r.delete(f)}})}return a.current=a.current+1,R});return V.jsx(k.Provider,{value:!0,children:V.jsxs("div",{ref:E,"aria-label":"Pin Input",className:o,...F,children:[_,V.jsx("input",{type:"hidden",name:A,form:N,value:e})]})})});j.displayName="PinInput";const $=({className:o,component:i,...w},E)=>{const{mask:l,type:g,inputKey:c,...p}=w;if(!s.useContext(k))throw new Error(`PinInputField must be used within ${j.displayName}.`);const I=i||"input";return V.jsx(I,{ref:E,type:l?"password":g==="numeric"?"tel":"text",inputMode:g==="numeric"?"numeric":"text",className:T("size-10 text-center",o),...p},c)},B=s.forwardRef($),G=({value:o,defaultValue:i,placeholder:w,type:E,length:l,readOnly:g})=>{const c=s.useMemo(()=>Array.from({length:l},(t,e)=>i?i.charAt(e):o?o.charAt(e):""),[i,l,o]),[p,m]=s.useState(c),I=p.join("").trim();s.useEffect(()=>{m(c)},[c]);const C=s.useRef(null);function A(){return C.current||(C.current=new Map),C.current}function N(t){const e=A();return e==null?void 0:e.get(t)}function d(t){const e=N(t);e&&(e.focus(),e.placeholder="")}function b(t,e){t.target.select(),d(e)}function v(t){const e=N(t);e&&(e.placeholder=w)}function P(t,e){const r=N(e);r&&(r.value=t),m(n=>n.map((a,y)=>y===e?t:a))}function D(t){return(E==="alphanumeric"?/^[a-zA-Z0-9]+$/i:/^[0-9]+$/).test(t)}const x=s.useRef(null);function F(t,e){const r=t.target.value,n=x.current,a=n?n.charAt(l-1):r.slice(-1);D(a)&&(P(a,e),x.current=null,r.length>0&&d(e+1))}function K(t){t.preventDefault();const e=t.clipboardData.getData("text/plain").replace(/[\n\r\s]+/g,""),r=e.split("").slice(0,l);if(r.every(a=>D(a))){for(let a=0;a<l;a++)a<r.length&&P(r[a],a);x.current=e,d(r.length<l?r.length:l-1)}}function h(t,e){const{ctrlKey:r,key:n,shiftKey:a,metaKey:y}=t;E==="numeric"&&(!(n==="Backspace"||n==="Tab"||n==="Control"||n==="Delete"||r&&n==="v"||y&&n==="v"||!Number.isNaN(Number(n)))||g)&&t.preventDefault(),n==="ArrowLeft"||a&&n==="Tab"?(t.preventDefault(),d(e-1)):n==="ArrowRight"||n==="Tab"||n===" "?(t.preventDefault(),d(e+1)):n==="Delete"?t.preventDefault():n==="Backspace"&&(t.preventDefault(),P("",e),t.target.value===""&&d(e-1))}return{pins:p,pinValue:I,refMap:A(),handleFocus:b,handleBlur:v,handleChange:F,handlePaste:K,handleKeyDown:h}},L=o=>s.Children.toArray(o).filter(i=>{if(s.isValidElement(i))return s.isValidElement(i);throw new Error(`${j.displayName} contains invalid children.`)}),M=o=>s.Children.toArray(o).filter(i=>{if(s.isValidElement(i)&&i.type===B)return s.isValidElement(i)}).length;export{j as P,B as a};
