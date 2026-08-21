import React from "react";
import { MonitorLayout } from "../components/MonitorLayout";
import { Hero } from "../components/Hero";
import { Features } from "../components/Features";
import { Footer } from "../components/Footer";

const LandingPage: React.FC = () => {
  return (
    <MonitorLayout
      footer={
        <>
          <div className="w-full mt-4">
            <Features />
          </div>
          <div className="w-full">
            <Footer />
          </div>
        </>
      }
    >
      <Hero />
    </MonitorLayout>
  );
};

export default LandingPage;
