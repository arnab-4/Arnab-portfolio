import {
    SiCplusplus,
    SiFramer,
    SiGithub, SiNeovim,
    SiNextdotjs,
    SiOpenai,
    SiReact,
    SiRust,
    SiTailwindcss,
    SiTypescript,
    SiZig
} from "react-icons/si";
import {IconType} from "react-icons";

export type ProjectProps = {
  id: number;
  name: string;
  description: string;
  technologies: IconType[];
  techNames: string[];
  techLinks: string[];
  github: string;
  demo: string;
  image: string;
  available: boolean;
};

export const projects = [
    {
        id: 0,
        name: "Portfolio 2023",
        description:
            "This is the fifth iteration of my portfolio.",
        technologies: [SiTypescript, SiReact, SiNextdotjs, SiTailwindcss, SiFramer],
        techNames: ["TypeScript", "React", "Next.js", "Tailwind CSS", "Framer Motion"],
        techLinks: ["https://www.typescriptlang.org/", "https://reactjs.org/", "https://nextjs.org/", "https://tailwindcss.com/", "https://www.framer.com/motion/"],
        github: "https://github.com/arnab-4",
        demo: "/",
        image: "/projects/portfolio.png",
        available: true,
    },
    {
        id: 1,
        name: "Get-Information",
        description:
            "The goal of this project is to give you an idea about types of information that websites can collect and access from you.",
        technologies: [SiNextdotjs, SiReact, SiTypescript, SiTailwindcss ],
        techNames: ["Next", "React", "TypeScript", "Tailwind CSS"],
        techLinks: ["https://nextjs.org/", "https://reactjs.org/", "https://www.typescriptlang.org/" , "https://tailwindcss.com/"],
        github: "https://github.com/arnab-4/Get-Information",
        demo: "https://getinfromation.netlify.app/",
        image: "/projects/getinformation.png",
        available: true,
    },
    {
        id: 2,
        name: "Coming Soon",
        description:
            "I'm currently working on a couple of projects. I'll update this section as soon as I'm done.",
        technologies: [SiOpenai],
        techNames: ["OpenAI"],
        techLinks: ["https://openai.com/"],
        github: "https://github.com/arnab-4/Blog-React",
        demo: "#",
        image: "/projects/construction.webp",
        available: true,
    },
];
