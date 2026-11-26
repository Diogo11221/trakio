package com.trakio.core.config;

import com.trakio.core.common.GlobalExceptionHandler;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

/**
 * Caps JSON bodies at 256 KB (uploads have their own multipart limits), including chunked
 * requests without a Content-Length, so a huge body can't exhaust memory.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class RequestSizeFilter extends OncePerRequestFilter {

    static final long MAX_JSON_BYTES = 256 * 1024;
    /** Stripe events can be larger than an app request. */
    static final long MAX_WEBHOOK_BYTES = 1024 * 1024;

    private final ObjectMapper json;

    public RequestSizeFilter(ObjectMapper json) {
        this.json = json;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String type = request.getContentType();
        if (type != null && type.toLowerCase().startsWith("multipart/")) {
            chain.doFilter(request, response);
            return;
        }
        long max = request.getRequestURI().equals("/api/v1/billing/stripe/webhook") ? MAX_WEBHOOK_BYTES : MAX_JSON_BYTES;
        if (request.getContentLengthLong() > max) {
            reject(response);
            return;
        }
        chain.doFilter(new LimitedRequest(request, max), response);
    }

    private void reject(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.CONTENT_TOO_LARGE.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        json.writeValue(response.getOutputStream(), GlobalExceptionHandler.problem(HttpStatus.CONTENT_TOO_LARGE,
                "body-too-large", "O pedido é demasiado grande."));
    }

    private static final class LimitedRequest extends HttpServletRequestWrapper {
        private final long max;
        private ServletInputStream stream;

        LimitedRequest(HttpServletRequest request, long max) {
            super(request);
            this.max = max;
        }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            if (stream == null) {
                ServletInputStream in = super.getInputStream();
                stream = new ServletInputStream() {
                    private long read;

                    @Override
                    public int read() throws IOException {
                        int b = in.read();
                        if (b >= 0 && ++read > max) {
                            throw new IOException("Request body too large");
                        }
                        return b;
                    }

                    @Override
                    public int read(byte[] buf, int off, int len) throws IOException {
                        int n = in.read(buf, off, len);
                        if (n > 0 && (read += n) > max) {
                            throw new IOException("Request body too large");
                        }
                        return n;
                    }

                    @Override
                    public boolean isFinished() {
                        return in.isFinished();
                    }

                    @Override
                    public boolean isReady() {
                        return in.isReady();
                    }

                    @Override
                    public void setReadListener(ReadListener listener) {
                        in.setReadListener(listener);
                    }
                };
            }
            return stream;
        }
    }
}
