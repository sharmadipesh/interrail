import Navbar from "@/components/generic/Navbar";
import Banner from "@/components/home/Banner";
import SectionTwo from "@/components/home/SectionTwo";
import SectionThree from "@/components/home/SectionThree";
import SectionFour from "@/components/home/SectionFour";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Banner />
      <SectionTwo />
      <SectionThree />
      <SectionFour />
    </main>
  );
}
