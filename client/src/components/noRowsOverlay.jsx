import Lottie from "lottie-react"
import animation from "../assets/images/Notfound"
const NoRowsOverlay = ({ text }) => (
	<div className="flex flex-col items-center justify-center h-fit">
		<Lottie
			animationData={animation}
			autoplay
			loop
			color="#E4E4E4"
			style={{ width: 200, height: 150 }}
		/>
		<span className=" text-center text-sm text-neutral-900 -translate-y-10 mt-5">
			{text}{" "}
		</span>
	</div>
)
export default NoRowsOverlay
