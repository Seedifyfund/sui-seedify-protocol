import{q as G,G as M,r as o,v as j,_ as T,w as H,H as F,I as z,J as B,K,z as q,y as U,M as V,N as Y,s as X,t as g,j as J,c as Q}from"./index-DJbGr_XK.js";const[P,Te]=G("Tooltip",[M]),R=M(),W="TooltipProvider",Z=700,D="tooltip.open",[ee,O]=P(W),te=t=>{const{__scopeTooltip:n,delayDuration:e=Z,skipDelayDuration:r=300,disableHoverableContent:a=!1,children:l}=t,[s,u]=o.useState(!0),c=o.useRef(!1),d=o.useRef(0);return o.useEffect(()=>{const i=d.current;return()=>window.clearTimeout(i)},[]),o.createElement(ee,{scope:n,isOpenDelayed:s,delayDuration:e,onOpen:o.useCallback(()=>{window.clearTimeout(d.current),u(!1)},[]),onClose:o.useCallback(()=>{window.clearTimeout(d.current),d.current=window.setTimeout(()=>u(!0),r)},[r]),isPointerInTransitRef:c,onPointerInTransitChange:o.useCallback(i=>{c.current=i},[]),disableHoverableContent:a},l)},k="Tooltip",[oe,_]=P(k),ne=t=>{const{__scopeTooltip:n,children:e,open:r,defaultOpen:a=!1,onOpenChange:l,disableHoverableContent:s,delayDuration:u}=t,c=O(k,t.__scopeTooltip),d=R(n),[i,f]=o.useState(null),v=q(),p=o.useRef(0),$=s??c.disableHoverableContent,x=u??c.delayDuration,b=o.useRef(!1),[m=!1,h]=U({prop:r,defaultProp:a,onChange:I=>{I?(c.onOpen(),document.dispatchEvent(new CustomEvent(D))):c.onClose(),l==null||l(I)}}),y=o.useMemo(()=>m?b.current?"delayed-open":"instant-open":"closed",[m]),C=o.useCallback(()=>{window.clearTimeout(p.current),b.current=!1,h(!0)},[h]),E=o.useCallback(()=>{window.clearTimeout(p.current),h(!1)},[h]),L=o.useCallback(()=>{window.clearTimeout(p.current),p.current=window.setTimeout(()=>{b.current=!0,h(!0)},x)},[x,h]);return o.useEffect(()=>()=>window.clearTimeout(p.current),[]),o.createElement(V,d,o.createElement(oe,{scope:n,contentId:v,open:m,stateAttribute:y,trigger:i,onTriggerChange:f,onTriggerEnter:o.useCallback(()=>{c.isOpenDelayed?L():C()},[c.isOpenDelayed,L,C]),onTriggerLeave:o.useCallback(()=>{$?E():window.clearTimeout(p.current)},[E,$]),onOpen:C,onClose:E,disableHoverableContent:$},e))},A="TooltipTrigger",re=o.forwardRef((t,n)=>{const{__scopeTooltip:e,...r}=t,a=_(A,e),l=O(A,e),s=R(e),u=o.useRef(null),c=H(n,u,a.onTriggerChange),d=o.useRef(!1),i=o.useRef(!1),f=o.useCallback(()=>d.current=!1,[]);return o.useEffect(()=>()=>document.removeEventListener("pointerup",f),[f]),o.createElement(Y,T({asChild:!0},s),o.createElement(X.button,T({"aria-describedby":a.open?a.contentId:void 0,"data-state":a.stateAttribute},r,{ref:c,onPointerMove:g(t.onPointerMove,v=>{v.pointerType!=="touch"&&!i.current&&!l.isPointerInTransitRef.current&&(a.onTriggerEnter(),i.current=!0)}),onPointerLeave:g(t.onPointerLeave,()=>{a.onTriggerLeave(),i.current=!1}),onPointerDown:g(t.onPointerDown,()=>{d.current=!0,document.addEventListener("pointerup",f,{once:!0})}),onFocus:g(t.onFocus,()=>{d.current||a.onOpen()}),onBlur:g(t.onBlur,a.onClose),onClick:g(t.onClick,a.onClose)})))}),ae="TooltipPortal",[ye,ce]=P(ae,{forceMount:void 0}),w="TooltipContent",se=o.forwardRef((t,n)=>{const e=ce(w,t.__scopeTooltip),{forceMount:r=e.forceMount,side:a="top",...l}=t,s=_(w,t.__scopeTooltip);return o.createElement(j,{present:r||s.open},s.disableHoverableContent?o.createElement(N,T({side:a},l,{ref:n})):o.createElement(ie,T({side:a},l,{ref:n})))}),ie=o.forwardRef((t,n)=>{const e=_(w,t.__scopeTooltip),r=O(w,t.__scopeTooltip),a=o.useRef(null),l=H(n,a),[s,u]=o.useState(null),{trigger:c,onClose:d}=e,i=a.current,{onPointerInTransitChange:f}=r,v=o.useCallback(()=>{u(null),f(!1)},[f]),p=o.useCallback(($,x)=>{const b=$.currentTarget,m={x:$.clientX,y:$.clientY},h=ue(m,b.getBoundingClientRect()),y=de(m,h),C=fe(x.getBoundingClientRect()),E=$e([...y,...C]);u(E),f(!0)},[f]);return o.useEffect(()=>()=>v(),[v]),o.useEffect(()=>{if(c&&i){const $=b=>p(b,i),x=b=>p(b,c);return c.addEventListener("pointerleave",$),i.addEventListener("pointerleave",x),()=>{c.removeEventListener("pointerleave",$),i.removeEventListener("pointerleave",x)}}},[c,i,p,v]),o.useEffect(()=>{if(s){const $=x=>{const b=x.target,m={x:x.clientX,y:x.clientY},h=(c==null?void 0:c.contains(b))||(i==null?void 0:i.contains(b)),y=!pe(m,s);h?v():y&&(v(),d())};return document.addEventListener("pointermove",$),()=>document.removeEventListener("pointermove",$)}},[c,i,s,d,v]),o.createElement(N,T({},t,{ref:l}))}),[le,Ce]=P(k,{isInside:!1}),N=o.forwardRef((t,n)=>{const{__scopeTooltip:e,children:r,"aria-label":a,onEscapeKeyDown:l,onPointerDownOutside:s,...u}=t,c=_(w,e),d=R(e),{onClose:i}=c;return o.useEffect(()=>(document.addEventListener(D,i),()=>document.removeEventListener(D,i)),[i]),o.useEffect(()=>{if(c.trigger){const f=v=>{const p=v.target;p!=null&&p.contains(c.trigger)&&i()};return window.addEventListener("scroll",f,{capture:!0}),()=>window.removeEventListener("scroll",f,{capture:!0})}},[c.trigger,i]),o.createElement(F,{asChild:!0,disableOutsidePointerEvents:!1,onEscapeKeyDown:l,onPointerDownOutside:s,onFocusOutside:f=>f.preventDefault(),onDismiss:i},o.createElement(z,T({"data-state":c.stateAttribute},d,u,{ref:n,style:{...u.style,"--radix-tooltip-content-transform-origin":"var(--radix-popper-transform-origin)","--radix-tooltip-content-available-width":"var(--radix-popper-available-width)","--radix-tooltip-content-available-height":"var(--radix-popper-available-height)","--radix-tooltip-trigger-width":"var(--radix-popper-anchor-width)","--radix-tooltip-trigger-height":"var(--radix-popper-anchor-height)"}}),o.createElement(B,null,r),o.createElement(le,{scope:e,isInside:!0},o.createElement(K,{id:c.contentId,role:"tooltip"},a||r))))});function ue(t,n){const e=Math.abs(n.top-t.y),r=Math.abs(n.bottom-t.y),a=Math.abs(n.right-t.x),l=Math.abs(n.left-t.x);switch(Math.min(e,r,a,l)){case l:return"left";case a:return"right";case e:return"top";case r:return"bottom";default:throw new Error("unreachable")}}function de(t,n,e=5){const r=[];switch(n){case"top":r.push({x:t.x-e,y:t.y+e},{x:t.x+e,y:t.y+e});break;case"bottom":r.push({x:t.x-e,y:t.y-e},{x:t.x+e,y:t.y-e});break;case"left":r.push({x:t.x+e,y:t.y-e},{x:t.x+e,y:t.y+e});break;case"right":r.push({x:t.x-e,y:t.y-e},{x:t.x-e,y:t.y+e});break}return r}function fe(t){const{top:n,right:e,bottom:r,left:a}=t;return[{x:a,y:n},{x:e,y:n},{x:e,y:r},{x:a,y:r}]}function pe(t,n){const{x:e,y:r}=t;let a=!1;for(let l=0,s=n.length-1;l<n.length;s=l++){const u=n[l].x,c=n[l].y,d=n[s].x,i=n[s].y;c>r!=i>r&&e<(d-u)*(r-c)/(i-c)+u&&(a=!a)}return a}function $e(t){const n=t.slice();return n.sort((e,r)=>e.x<r.x?-1:e.x>r.x?1:e.y<r.y?-1:e.y>r.y?1:0),ve(n)}function ve(t){if(t.length<=1)return t.slice();const n=[];for(let r=0;r<t.length;r++){const a=t[r];for(;n.length>=2;){const l=n[n.length-1],s=n[n.length-2];if((l.x-s.x)*(a.y-s.y)>=(l.y-s.y)*(a.x-s.x))n.pop();else break}n.push(a)}n.pop();const e=[];for(let r=t.length-1;r>=0;r--){const a=t[r];for(;e.length>=2;){const l=e[e.length-1],s=e[e.length-2];if((l.x-s.x)*(a.y-s.y)>=(l.y-s.y)*(a.x-s.x))e.pop();else break}e.push(a)}return e.pop(),n.length===1&&e.length===1&&n[0].x===e[0].x&&n[0].y===e[0].y?n:n.concat(e)}const be=te,xe=ne,he=re,S=se,Ee=be,we=xe,Pe=he,me=o.forwardRef(({className:t,sideOffset:n=4,...e},r)=>J.jsx(S,{ref:r,sideOffset:n,className:Q("z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",t),...e}));me.displayName=S.displayName;export{Ee as T,we as a,Pe as b,me as c};
