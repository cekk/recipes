import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import Modal from "@material-ui/core/Modal";
import Divider from "@material-ui/core/Divider";
import ReactPlayer from "react-player";

const useStyles = makeStyles((theme) => ({
  paper: {
    position: "absolute",
    // width: 400,
    backgroundColor: theme.palette.background.paper,
    border: "2px solid #000",
    boxShadow: theme.shadows[5],
    padding: theme.spacing(2, 4, 3),
    top: "50%",
    left: "40%",
  },
  root: {
    width: "90%",
  },
  header: {
    marginTop: "1em",
  },
}));

const Note = ({ note }) => {
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };
  return (
    <div>
      <p>{note.description}</p>
      <Button onClick={handleOpen}>Vedi</Button>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
      >
        <div className={classes.paper}>
          {note.videoUrl ? <ReactPlayer url={note.videoUrl} playing /> : ""}
        </div>
      </Modal>
    </div>
  );
};

export default function Notes({ notes }) {
  const classes = useStyles();
  if (!notes) {
    return "";
  }
  return (
    <div className={classes.root}>
      <Divider />
      <Typography variant="h4" gutterBottom className={classes.header}>
        Note
      </Typography>
      {notes.map((note, index) => (
        <Note key={`note-${index}`} note={note}></Note>
      ))}
    </div>
  );
}
