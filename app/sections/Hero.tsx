/* eslint-disable @typescript-eslint/indent */

import React from "react";
import { motion } from "framer-motion";

import { IoIosArrowForward } from 'react-icons/io';

export default function MyName(props: { finishedLoading: boolean }) {
  
    return (
        <div
            className="h-full flex flex-col justify-center
      px-8 2xl:px-72 xl:px-56 lg:px-32  md:px-28 sm:px-8 py-32 sm:py-52 overflow-hidden bg-[#0E1016] bg-cover bg-center " id="home"
        >
            <motion.span
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                    opacity: { delay: props.finishedLoading ? 0 : 2, duration: props.finishedLoading ? 0 : 0.1 },
                    y: { delay: props.finishedLoading ? 0 : 2, duration: props.finishedLoading ? 0 : 0.1 },
                }}
                className="text-AAsecondary font-mono"
            >
        Hi, my name is
            </motion.span>
            <motion.h1
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                    opacity: { delay: props.finishedLoading ? 0 : 5, duration: props.finishedLoading ? 0 : 0.2 },
                    y: { delay: props.finishedLoading ? 0 : 5, duration: props.finishedLoading ? 0 : 0.2 },
                }}
                className="text-gray-300 font-bold text-3xl lg:text-7xl sm:text-5xl md:text-6xl mt-4"
            >
        Arnab <span className=" text-AAsecondary">Manna</span>
            </motion.h1>
            <motion.h2
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                    opacity: { delay: props.finishedLoading ? 0 : 6.5, duration: props.finishedLoading ? 0 : 0.2 },
                    y: { delay: props.finishedLoading ? 0 : 6.5, duration: props.finishedLoading ? 0 : 0.2 },
                }}
                className="text-gray-400 font-bold text-1xl lg:text-2xl sm:text-1xl md:text-2xl mt-4"
            >
      I am a Developer
            </motion.h2>

            <motion.h3
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                    opacity: { delay: props.finishedLoading ? 0 : 7.7, duration: props.finishedLoading ? 0 : 0.2 },
                    y: { delay: props.finishedLoading ? 0 : 7.7, duration: props.finishedLoading ? 0 : 0.2 },
                }}
                className="text-gray-400 font-Header text-sm md:text-lg sm:text-md mt-10 tracking-wider"
            >
        I&apos;m a <span className="text-AAsecondary">software engineer</span>, i possess strong problem-solving skills and
        specialize in crafting exceptional <br className="2xl:block hidden" />
        digital experiences. My current area of focus is in the <span className="text-AAsecondary">web3 domain</span>,
        where I actively engage in developing <br className="2xl:block hidden"/>
        and designing immersive <span className="text-AAsecondary">web3 applications</span>.
                {/* This involves working with{" "}
        <span className="text-AAsecondary">Smart Contracts</span>  
        on the{" "}
        <span className="text-AAsecondary">Blockchain</span>.  */}
                <br className="2xl:block hidden" />creating and deploying them, as well as implementing the
        front-end components to enable seamless user interactions.
            </motion.h3>
            <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                    opacity: { delay: props.finishedLoading ? 0 : 9.8, duration: props.finishedLoading ? 0 : 0.2 },
                    y: { delay: props.finishedLoading ? 0 : 8.8, duration: props.finishedLoading ? 0 : 0.2 },
                }}
                className="mt-12"
            >
        

                <a
                    href={"/resume.pdf"}
                    target={"_blank"}
                    rel="noreferrer"
                    className="text-gray-400 font-Header text-sm md:text-lg sm:text-md mt-10 tracking-wider flex items-center space-x-2 group"
                    style={{ textDecoration: 'underline' }}
                >
                    <span className="text-AAsecondary">Learn more about me</span>
                    <IoIosArrowForward className="text-AAsecondary transform scale-0 group-hover:scale-100 transition-transform duration-300" />
                </a>

            </motion.div>
        </div>
    );
}
