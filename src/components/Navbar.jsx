import React from "react";
import logo from "../assets/logo.png"; // Assuming the logo is in the assets folder
import { Icon } from "@iconify/react/dist/iconify.js";

const Navbar = () => {
  return (
    <nav className="w-full py-2 flex items-center justify-between bg-gray-100/10 shadow-md myContainer backdrop-blur-2xl rounded-4xl px-6">
      <img src={logo} alt="Logo" className="h-12" />
      <ul className="flex gap-x-1 text-gray-200 font-medium items-center">
        <li className="px-5 py-2 rounded-full hover:bg-gray-100/20 transition-all duration-300 cursor-pointer">
          How to use
        </li>
        <li className=" text-[30px] px-2 py-2 rounded-full hover:bg-gray-100/20 transition-all duration-300 cursor-pointer">
          <a
            className="h-full w-full"
            target="_blank"
            href="https://github.com/jeslor/draw_anything"
          >
            <Icon icon="ri:github-fill" />
          </a>
        </li>
        <li className=" text-[30px] px-2 py-2 rounded-full hover:bg-gray-100/20 transition-all duration-300 cursor-pointer">
          <a
            className="h-full w-full"
            target="_blank"
            href="https://www.linkedin.com/in/jeslor-ssozi/"
          >
            <Icon icon="jam:linkedin-circle" />
          </a>
        </li>
        <li className=" text-[24px] px-2 py-2 rounded-full hover:bg-gray-100/20 transition-all duration-300 cursor-pointer">
          <a
            className="h-full w-full"
            target="_blank"
            href="https://www.jeslor.com/"
          >
            <Icon icon="fluent-mdl2:website" />
          </a>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
