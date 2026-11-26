import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import StorefrontFrame from "@/components/StorefrontFrame";
import ConsoleSilencer from "@/components/ConsoleSilencer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Izha Blooms | Where Every Thread Blooms",
  description:
    "Handcrafted embroidered kurtas, dresses and contemporary ethnic wear from Izha Blooms.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var noop=function(){};var rawClear=window.console&&window.console.clear?window.console.clear.bind(window.console):noop;var methods=['log','debug','info','warn','error','assert','dir','dirxml','group','groupCollapsed','groupEnd','time','timeEnd','timeLog','trace','table','count','countReset'];for(var i=0;i<methods.length;i++){try{Object.defineProperty(window.console,methods[i],{get:function(){return noop;},set:function(){},configurable:true});}catch(_){window.console[methods[i]]=noop;}}window.addEventListener('error',function(e){e.preventDefault();e.stopImmediatePropagation();try{rawClear();}catch(_){}return true;},true);window.addEventListener('unhandledrejection',function(e){e.preventDefault();e.stopImmediatePropagation();try{rawClear();}catch(_){}return true;},true);setInterval(function(){try{rawClear();}catch(_){}},1500);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} overflow-x-clip antialiased`}
      >
        <ConsoleSilencer />
        <StorefrontFrame>{children}</StorefrontFrame>
      </body>
    </html>
  );
}