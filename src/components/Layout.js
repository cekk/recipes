import React from "react";
// import { Link } from "gatsby";
import CssBaseline from "@material-ui/core/CssBaseline";
import Container from "@material-ui/core/Container";
import Header from "./Header";
import Paper from "@material-ui/core/Paper";

export default function Layout({ children }) {
  return (
    <React.Fragment>
      <CssBaseline />
      <Header></Header>
      <Container>
        <Paper>{children}</Paper>
      </Container>
    </React.Fragment>
  );
}
