import{r as y,j as e,c as h,L as v,B as p,ay as S}from"./index-DJbGr_XK.js";import{S as N}from"./separator-BLDzuZEp.js";import{z as a}from"./index-DXqQCM1T.js";import{u as F,t as w,g as U,F as C,a as o,b as l,c as n,d as t,f as i,e as c}from"./form-C2R2OZWO.js";import{I as j}from"./input-COSP1Qgd.js";import{S as I,a as L,b as T,c as P,d as x}from"./select-B_9foU1Z.js";import"./index-5UkE9UHW.js";const f=y.forwardRef(({className:r,...m},d)=>e.jsx("textarea",{className:h("flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",r),ref:d,...m}));f.displayName="Textarea";const R=a.object({username:a.string().min(2,{message:"Username must be at least 2 characters."}).max(30,{message:"Username must not be longer than 30 characters."}),email:a.string({required_error:"Please select an email to display."}).email(),bio:a.string().max(160).min(4),urls:a.array(a.object({value:a.string().url({message:"Please enter a valid URL."})})).optional()}),k={bio:"I own a computer.",urls:[{value:"https://shadcn.com"},{value:"http://twitter.com/shadcn"}]};function z(){const r=F({resolver:w(R),defaultValues:k,mode:"onChange"}),{fields:m,append:d}=U({name:"urls",control:r.control});function g(s){S({title:"You submitted the following values:",description:e.jsx("pre",{className:"mt-2 w-[340px] rounded-md bg-slate-950 p-4",children:e.jsx("code",{className:"text-white",children:JSON.stringify(s,null,2)})})})}return e.jsx(C,{...r,children:e.jsxs("form",{onSubmit:r.handleSubmit(g),className:"space-y-8",children:[e.jsx(o,{control:r.control,name:"username",render:({field:s})=>e.jsxs(l,{children:[e.jsx(n,{children:"Username"}),e.jsx(t,{children:e.jsx(j,{placeholder:"shadcn",...s})}),e.jsx(i,{children:"This is your public display name. It can be your real name or a pseudonym. You can only change this once every 30 days."}),e.jsx(c,{})]})}),e.jsx(o,{control:r.control,name:"email",render:({field:s})=>e.jsxs(l,{children:[e.jsx(n,{children:"Email"}),e.jsxs(I,{onValueChange:s.onChange,defaultValue:s.value,children:[e.jsx(t,{children:e.jsx(L,{children:e.jsx(T,{placeholder:"Select a verified email to display"})})}),e.jsxs(P,{children:[e.jsx(x,{value:"m@example.com",children:"m@example.com"}),e.jsx(x,{value:"m@google.com",children:"m@google.com"}),e.jsx(x,{value:"m@support.com",children:"m@support.com"})]})]}),e.jsxs(i,{children:["You can manage verified email addresses in your"," ",e.jsx(v,{to:"/examples/forms",children:"email settings"}),"."]}),e.jsx(c,{})]})}),e.jsx(o,{control:r.control,name:"bio",render:({field:s})=>e.jsxs(l,{children:[e.jsx(n,{children:"Bio"}),e.jsx(t,{children:e.jsx(f,{placeholder:"Tell us a little bit about yourself",className:"resize-none",...s})}),e.jsxs(i,{children:["You can ",e.jsx("span",{children:"@mention"})," other users and organizations to link to them."]}),e.jsx(c,{})]})}),e.jsxs("div",{children:[m.map((s,u)=>e.jsx(o,{control:r.control,name:`urls.${u}.value`,render:({field:b})=>e.jsxs(l,{children:[e.jsx(n,{className:h(u!==0&&"sr-only"),children:"URLs"}),e.jsx(i,{className:h(u!==0&&"sr-only"),children:"Add links to your website, blog, or social media profiles."}),e.jsx(t,{children:e.jsx(j,{...b})}),e.jsx(c,{})]})},s.id)),e.jsx(p,{type:"button",variant:"outline",size:"sm",className:"mt-2",onClick:()=>d({value:""}),children:"Add URL"})]}),e.jsx(p,{type:"submit",children:"Update profile"})]})})}function J(){return e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"text-lg font-medium",children:"Profile"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"This is how others will see you on the site."})]}),e.jsx(N,{className:"my-4"}),e.jsx(z,{})]})}export{J as default};
