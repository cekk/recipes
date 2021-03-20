import React from "react";
import Typography from "@material-ui/core/Typography";
import CardContent from "@material-ui/core/CardContent";
import Chip from "@material-ui/core/Chip";

const Infos = ({ source }) => {
  return (
    <CardContent>
      <Typography gutterBottom variant="h5" component="h2">
        Fonte
      </Typography>
      <Chip
        variant="outlined"
        size="small"
        label={source.name}
        component="a"
        href={source.url}
        clickable
      />
    </CardContent>
  );
};

export default Infos;
