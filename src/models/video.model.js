import moongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"; 


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


videoSchema.plugin(mongooseAggregatePaginate)

export const Video = moongoose.model("Video", videoSchema);
