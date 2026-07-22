import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

const images = [
  "https://res.cloudinary.com/f4dgf8a1/image/upload/v1783786051/living_q7nigh.png",
  "https://res.cloudinary.com/f4dgf8a1/image/upload/v1783786048/bed_iwitsb.png",
  "https://res.cloudinary.com/f4dgf8a1/image/upload/v1783786050/garden_e3upmi.png"
];

export default function RoomSlider() {
  return (
    <Swiper spaceBetween={20} slidesPerView={1.2}>
      {images.map((img, i) => (
        <SwiperSlide key={i}>
          <img
            src={img}
            style={{
              width: "100%",
              height: 300,
              objectFit: "cover",
              borderRadius: 8
            }}
          />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
