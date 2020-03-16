import React from "react";
import { makeStyles } from "@material-ui/core/styles";
// import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";

const useStyles = makeStyles(theme => ({
  root: {
    width: "90%"
  },
  procedureItem: {
    margin: "1em 0",
    "&:before": {
      backgroundColor: "red"
    }
  }
}));

export default function Procedure({ steps }) {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <Typography variant="h3" gutterBottom>
        Procedura
      </Typography>
      <div>
        <ol className={classes.procedureList}>
          {steps.map((label, index) => (
            <li className={classes.procedureItem} key={label}>
              {label}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
