import{r as o,j as e,c as u,B as f,L as h}from"./index-DJbGr_XK.js";import{C as p}from"./card-H81EDeGe.js";import{u as j,t as g,F as v,a as N,b,d as w,e as y}from"./form-C2R2OZWO.js";import{z as i}from"./index-DXqQCM1T.js";import{I as F}from"./input-COSP1Qgd.js";import{P as S,a as I}from"./pin-input-ZEIELVRr.js";import{S as k}from"./separator-BLDzuZEp.js";const L=i.object({otp:i.string().min(1,{message:"Please enter your otp code."})});function B({className:l,...c}){const[m,n]=o.useState(!1),[d,a]=o.useState(!0),t=j({resolver:g(L),defaultValues:{otp:""}});function x(s){n(!0),console.log({data:s}),setTimeout(()=>{t.reset(),n(!1)},2e3)}return e.jsx("div",{className:u("grid gap-6",l),...c,children:e.jsx(v,{...t,children:e.jsx("form",{onSubmit:t.handleSubmit(x),children:e.jsxs("div",{className:"grid gap-2",children:[e.jsx(N,{control:t.control,name:"otp",render:({field:s})=>e.jsxs(b,{className:"space-y-1",children:[e.jsx(w,{children:e.jsx(S,{...s,className:"flex h-10 justify-between",onComplete:()=>a(!1),onIncomplete:()=>a(!0),children:Array.from({length:7},(C,r)=>r===3?e.jsx(k,{orientation:"vertical"},r):e.jsx(I,{component:F,className:`${t.getFieldState("otp").invalid?"border-red-500":""}`},r))})}),e.jsx(y,{})]})}),e.jsx(f,{className:"mt-2",disabled:d,loading:m,children:"Verify"})]})})})})}function A(){return e.jsx(e.Fragment,{children:e.jsx("div",{className:"container grid h-svh flex-col items-center justify-center bg-primary-foreground lg:max-w-none lg:px-0",children:e.jsxs("div",{className:"mx-auto flex w-full flex-col justify-center space-y-2 sm:w-[480px] lg:p-8",children:[e.jsxs("div",{className:"mb-4 flex items-center justify-center",children:[e.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",className:"mr-2 h-6 w-6",children:e.jsx("path",{d:"M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"})}),e.jsx("h1",{className:"text-xl font-medium",children:"TORQUE NETWORK"})]}),e.jsxs(p,{className:"p-6",children:[e.jsxs("div",{className:"mb-2 flex flex-col space-y-2 text-left",children:[e.jsx("h1",{className:"text-md font-semibold tracking-tight",children:"Two-factor Authentication"}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:["Please enter the authentication code. ",e.jsx("br",{})," We have sent the authentication code to your email."]})]}),e.jsx(B,{}),e.jsxs("p",{className:"mt-4 px-8 text-center text-sm text-muted-foreground",children:["Haven't received it?"," ",e.jsx(h,{to:"/resent-new-code",className:"underline underline-offset-4 hover:text-primary",children:"Resend a new code."}),"."]})]})]})})})}export{A as default};
