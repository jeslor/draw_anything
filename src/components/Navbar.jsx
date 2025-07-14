import React from "react";
import logo from "../assets/logo.png"; // Assuming the logo is in the assets folder
import { Icon } from "@iconify/react/dist/iconify.js";

const Navbar = () => {
  return (
    <nav className="flex items-center justify-center fixed w-full top-0 z-[200] bg-gray-100/10 border-gray-100/10 border-[1px] backdrop-blur-2xl">
      <div className="h-[60px]  w-full py-2 flex items-center justify-between  shadow-md mx-auto max-w-[1200px] rounded-4xl px-6 ">
        <div className="flex items-center gap-x-4">
          <img src={logo} alt="Logo" className="h-12" />
          <h2 className="text-2xl font-bold text-secondaryColor">
            Draw Anything
          </h2>
        </div>
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
      </div>
    </nav>
  );
};

export default Navbar;
