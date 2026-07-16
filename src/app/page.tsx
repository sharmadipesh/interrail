import Navbar from "@/components/generic/Navbar";
import Banner from "@/components/home/Banner";
import SectionTwo from "@/components/home/SectionTwo";
import SectionThree from "@/components/home/SectionThree";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Banner />
      <SectionTwo />
      <SectionThree />
    </main>
  );
}
