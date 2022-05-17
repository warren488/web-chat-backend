
const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;
/** @namespace */
let PlaylistSchema = new mongoose.Schema({
  name: {
    type: String,
    index: true
  },
  friendship_id: {
    type: String,
    required: true,
    default: false
  },
  // createdAt: {
  //   type: Number,
  //   required: true,
  //   index: true
  // },
  createdBy: {
    type: ObjectId,
    required: true,
    index: true
  },
  vids: {
    type: Array
  }
});

async function getPlaylists(Ids) {
  return this.find({ $or: Ids.map(id => ({ _id: id })) })
}

async function addVidToPlaylist({ listId, vid, session }) {
  let playlist = await this.findById(listId);
  console.log(playlist);
  playlist.vids.push(vid)
  return playlist.save({ session })
}


PlaylistSchema.statics.getPlaylists = getPlaylists
PlaylistSchema.statics.addVidToPlaylist = addVidToPlaylist
let Playlist = mongoose.model("Playlist", PlaylistSchema);

module.exports = Playlist;
