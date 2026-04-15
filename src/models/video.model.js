import moongoose, { Schema } from "mongoose";



const videoSchema = new Schema({
    videofile: {
      type: String, //cloudianry url
      required: true,
    },
    thumbnail: {
      type: String, //cloudianry url
      required: true,
    },
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    duartion: {
      type: Number, //cloudinary 
      required: true
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Video = moongoose.model("Video", videoSchema);
